type PlanPaywallController = {
  open: () => void;
  close: () => void;
};

let controller: PlanPaywallController | null = null;

export function registerPlanPaywallController(next: PlanPaywallController | null): void {
  controller = next;
}

export function openPlanPaywallFromController(): void {
  controller?.open();
}

export function closePlanPaywallFromController(): void {
  controller?.close();
}
