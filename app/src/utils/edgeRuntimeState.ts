export type EdgeRuntimeState = 'edge-pending' | 'edge-active' | 'edge-completed' | 'edge-failed'

export interface EdgeRuntimeVisual {
  state: EdgeRuntimeState
  animated: boolean
}

export interface ResolveEdgeRuntimeStateOptions {
  contextFailed?: boolean
}

function isFailedState(state: string | undefined): boolean {
  return state === 'failed' || state === 'error'
}

function isActiveState(state: string | undefined): boolean {
  return state === 'active' || state === 'running'
}

function isCompletedState(state: string | undefined): boolean {
  return state === 'completed' || state === 'success'
}

function isWaitingState(state: string | undefined): boolean {
  return state === 'waiting'
}

export function resolveEdgeRuntimeState(
  sourceState: string | undefined,
  targetState: string | undefined,
  options?: ResolveEdgeRuntimeStateOptions,
): EdgeRuntimeVisual {
  const contextFailed = options?.contextFailed ?? false

  if (isFailedState(targetState)) {
    return { state: 'edge-failed', animated: false }
  }

  if (contextFailed) {
    if (isActiveState(targetState) || isWaitingState(targetState)) {
      return { state: 'edge-failed', animated: false }
    }
    if (isActiveState(sourceState) || isWaitingState(sourceState)) {
      return { state: 'edge-failed', animated: false }
    }
  }

  if (isFailedState(sourceState)) {
    return { state: 'edge-failed', animated: false }
  }

  if (isActiveState(targetState) && isCompletedState(sourceState)) {
    return { state: 'edge-active', animated: true }
  }

  if (isActiveState(targetState)) {
    return { state: 'edge-active', animated: true }
  }

  if (isCompletedState(sourceState) && isCompletedState(targetState)) {
    return { state: 'edge-completed', animated: false }
  }

  return { state: 'edge-pending', animated: false }
}
