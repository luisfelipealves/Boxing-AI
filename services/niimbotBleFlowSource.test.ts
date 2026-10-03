import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');

const getFunctionBody = (functionName: string): string => {
  const start = appSource.indexOf(`const ${functionName} = async`);
  expect(start, `${functionName} should exist`).toBeGreaterThanOrEqual(0);
  const bodyStart = appSource.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return appSource.slice(bodyStart, index + 1);
    }
  }
  throw new Error(`Unable to parse ${functionName} body`);
};

describe('NIIMBOT BLE App flow source guards', () => {
  it('sets up a selected B1 Pro through one identify call instead of connect then identify', () => {
    const setupBody = getFunctionBody('identifySelectedPrinter');

    expect(setupBody).not.toContain('NiimbotBlePrinter.connect(');
    expect(setupBody.match(/NiimbotBlePrinter\.identify\(/g) ?? []).toHaveLength(1);
  });

  it('prints by letting native printLabel perform reconnect and validation once', () => {
    const printBody = getFunctionBody('printCurrentLabel');

    expect(printBody).not.toContain('NiimbotBlePrinter.identify(');
    expect(printBody).toContain('buildNiimbotPrintRequest(selectedPrinter.reconnectId, snapshot)');
    expect(printBody.match(/NiimbotBlePrinter\.printLabel\(/g) ?? []).toHaveLength(1);
  });

  it('does not keep the prepare step visually active after identify is no longer busy', () => {
    expect(appSource).toContain('const activeStep = isBusy ? step : null;');
    expect(appSource).toContain('if (activeStep === stepId) return \'active\';');
    expect(appSource).toContain('renderStepIcon(stepState)');
  });

  it('renders a print trace panel and logs render failures with the thrown message', () => {
    const printBody = getFunctionBody('printCurrentLabel');

    expect(appSource).toContain('NIIMBOT print trace');
    expect(appSource).toContain('const appendTrace = (message: string, detail?: string) =>');
    expect(appSource).toContain('Print trace entries are shown newest last for hardware debugging.');
    expect(printBody).toContain("setFlowStep('rendering', 'Render label raster started'");
    expect(printBody).toContain("appendTrace('Render label raster failed'");
    expect(printBody).toContain('renderError instanceof Error ? renderError.message');
  });

  it('uses completed, active, failed, and pending styles for B1 Pro checklist rows', () => {
    expect(appSource).toContain('const getStepState = (stepId: NiimbotPrintProgressStep): NiimbotChecklistState =>');
    expect(appSource).toContain("case 'complete':");
    expect(appSource).toContain("text-emerald-700");
    expect(appSource).toContain("case 'failed':");
    expect(appSource).toContain("text-red-700");
    expect(appSource).toContain("case 'pending':");
  });
});
