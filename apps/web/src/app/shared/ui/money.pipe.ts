import { Pipe, type PipeTransform } from '@angular/core';

// Backend money is always in minor units (paise) — this is the single place that converts.
@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(minorUnits: number | null | undefined, showDecimals = false): string {
    const value = (minorUnits ?? 0) / 100;
    return `₹${value.toFixed(showDecimals || value % 1 !== 0 ? 2 : 0)}`;
  }
}
