/** Préférences locales (par navigateur). L'accès au stockage est protégé : il peut être bloqué (navigation privée). */
export function getBudgetAlertsEnabled(): boolean {
  try {
    return localStorage.getItem('budgetAlerts') !== 'off';
  } catch {
    return true;
  }
}

export function setBudgetAlertsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('budgetAlerts', enabled ? 'on' : 'off');
  } catch {
    /* stockage indisponible : la préférence ne sera pas conservée */
  }
}
