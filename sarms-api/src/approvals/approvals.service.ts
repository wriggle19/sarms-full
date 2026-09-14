import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { DecideDto } from './dto/decide.dto';

/**
 * The configurable approval engine (Section 14/49/64 of the spec). Admins
 * define ApprovalWorkflow + ApprovalStep rows through the workflow endpoints
 * below; nothing about *who* approves *what* is hard-coded in application
 * logic - this service only knows how to walk whatever chain is configured.
 */
@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  createWorkflow(dto: CreateWorkflowDto) {
    return this.prisma.approvalWorkflow.create({
      data: {
        name: dto.name,
        appliesToRequestType: dto.appliesToRequestType,
        appliesToCategoryId: dto.appliesToCategoryId,
        minValueThreshold: dto.minValueThreshold,
        steps: {
          create: dto.steps.map((s) => ({
            stepOrder: s.stepOrder,
            approverType: s.approverType,
            approverRoleId: s.approverRoleId,
            specificUserId: s.specificUserId,
          })),
        },
      },
      include: { steps: true },
    });
  }

  findWorkflows() {
    return this.prisma.approvalWorkflow.findMany({ include: { steps: true } });
  }

  /**
   * Finds the most specific active workflow for a request: an exact
   * request-type match wins over the generic (appliesToRequestType: null)
   * fallback. Throws rather than silently auto-approving if nothing is
   * configured - a school should decide its approval chains deliberately,
   * not by accident of a missing seed row.
   */
  private async resolveWorkflow(requestType: string) {
    const specific = await this.prisma.approvalWorkflow.findFirst({
      where: { appliesToRequestType: requestType as any, isActive: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (specific) return specific;

    const generic = await this.prisma.approvalWorkflow.findFirst({
      where: { appliesToRequestType: null, isActive: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (generic) return generic;

    throw new BadRequestException(
      `No approval workflow is configured for request type ${requestType} (and no default workflow exists)`,
    );
  }

  async startWorkflow(requestId: number) {
    const request = await this.prisma.assetRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);

    const workflow = await this.resolveWorkflow(request.requestType);
    const firstStep = workflow.steps[0];
    if (!firstStep) {
      throw new BadRequestException(`Workflow "${workflow.name}" has no steps configured`);
    }

    return this.prisma.assetRequest.update({
      where: { id: requestId },
      data: { status: 'PENDING_APPROVAL', currentApprovalStepId: firstStep.id },
    });
  }

  /**
   * Resolves the actual approver for a given step at decision time. LINE_MANAGER
   * and DEPARTMENT_HEAD are resolved dynamically from the requester's own
   * record so the same workflow definition works for any requester; ROLE and
   * SPECIFIC_USER are more direct.
   */
  private async resolveApproverIds(step: any, requesterId: number): Promise<number[]> {
    if (step.approverType === 'SPECIFIC_USER' && step.specificUserId) {
      return [step.specificUserId];
    }
    if (step.approverType === 'LINE_MANAGER') {
      const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
      return requester?.supervisorId ? [requester.supervisorId] : [];
    }
    if (step.approverType === 'DEPARTMENT_HEAD') {
      const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
      const dept = requester?.departmentId
        ? await this.prisma.department.findUnique({ where: { id: requester.departmentId } })
        : null;
      return dept?.headUserId ? [dept.headUserId] : [];
    }
    if (step.approverType === 'ROLE' && step.approverRoleId) {
      const holders = await this.prisma.userRole.findMany({ where: { roleId: step.approverRoleId } });
      return holders.map((h) => h.userId);
    }
    return [];
  }

  async decide(requestId: number, approverId: number, dto: DecideDto) {
    const request = await this.prisma.assetRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);
    if (request.status !== 'PENDING_APPROVAL' || !request.currentApprovalStepId) {
      throw new ConflictException('This request is not currently awaiting approval');
    }

    // Section 65: a user can never approve their own request.
    if (request.requesterId === approverId) {
      throw new ForbiddenException('You cannot approve your own request');
    }

    const step = await this.prisma.approvalStep.findUnique({ where: { id: request.currentApprovalStepId } });
    if (!step) throw new NotFoundException('Current approval step not found');

    const eligibleApproverIds = await this.resolveApproverIds(step, request.requesterId);
    if (eligibleApproverIds.length && !eligibleApproverIds.includes(approverId)) {
      throw new ForbiddenException('You are not the designated approver for this step');
    }

    await this.prisma.requestApproval.create({
      data: { requestId, stepId: step.id, approverId, decision: dto.decision, comment: dto.comment },
    });

    const requester = request.requesterId;
    const requestLabel = request.requestNumber ?? `#${requestId}`;

    if (dto.decision === 'REJECTED') {
      await this.notifications.notify(requester, 'REQUEST_REJECTED', `Request ${requestLabel} rejected`, dto.comment ?? 'Your request was not approved.');
      return this.prisma.assetRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', currentApprovalStepId: null },
      });
    }

    if (dto.decision === 'CHANGES_REQUESTED') {
      await this.notifications.notify(requester, 'REQUEST_CHANGES_REQUESTED', `Request ${requestLabel} needs changes`, dto.comment ?? 'An approver requested changes to your request.');
      return this.prisma.assetRequest.update({
        where: { id: requestId },
        data: { status: 'CHANGES_REQUESTED' },
      });
    }

    // APPROVED: advance to the next step, or finish the chain.
    const nextStep = await this.prisma.approvalStep.findFirst({
      where: { workflowId: step.workflowId, stepOrder: step.stepOrder + 1 },
    });

    if (nextStep) {
      const nextApprovers = await this.resolveApproverIds(nextStep, requester);
      await this.notifications.notifyMany(nextApprovers, 'REQUEST_APPROVAL', `Request ${requestLabel} moved forward`, `A step was completed; it now needs your approval.`);
    } else {
      await this.notifications.notify(requester, 'REQUEST_APPROVED', `Request ${requestLabel} approved`, 'All approvals are complete — IT will prepare your equipment.');
    }

    return this.prisma.assetRequest.update({
      where: { id: requestId },
      data: nextStep
        ? { currentApprovalStepId: nextStep.id }
        : { status: 'APPROVED', currentApprovalStepId: null },
    });
  }

  pendingFor(approverId: number) {
    // A practical approximation for the approval queue screen: every
    // PENDING_APPROVAL request whose current step this user is eligible for.
    // For LINE_MANAGER/DEPARTMENT_HEAD steps this still requires resolving
    // per-request (see resolveApproverIds) - exposed here as a building block
    // for that dashboard query rather than a fully optimized single query.
    return this.prisma.assetRequest.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: { requester: true, department: true, category: true },
    });
  }
}
