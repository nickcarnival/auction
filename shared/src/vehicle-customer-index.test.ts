import { describe, expect, it } from 'vitest';
import { buildVehicleCustomerIndex } from './vehicle-customer-index';

describe('buildVehicleCustomerIndex', () => {
  it('groups by vehicle and dedupes customers', () => {
    const rows = buildVehicleCustomerIndex([
      { vehicle: ' 2020 Road King ', customerId: 'c1', customer: 'Alice' },
      { vehicle: '2020 Road King', customerId: 'c1', customer: 'Alice A.' },
      { vehicle: '2021 Softail', customerId: 'c2', customer: 'Bob' },
    ]);

    expect(rows).toHaveLength(2);
    const roadKing = rows.find(r => r.vehicleDescription === '2020 Road King');
    expect(roadKing?.customers).toHaveLength(1);
    expect(roadKing?.customers[0]?.customerId).toBe('c1');

    const softail = rows.find(r => r.vehicleDescription === '2021 Softail');
    expect(softail?.customers).toHaveLength(1);
    expect(softail?.customers[0]?.displayName).toBe('Bob');
  });

  it('sorts vehicles and customer names', () => {
    const rows = buildVehicleCustomerIndex([
      { vehicle: 'Zebra', customer: 'Morgan' },
      { vehicle: 'Alpha', customer: 'Charlie' },
      { vehicle: 'Alpha', customer: 'Alice' },
    ]);

    expect(rows.map(r => r.vehicleDescription)).toEqual(['Alpha', 'Zebra']);
    expect(rows[0]?.customers.map(c => c.displayName)).toEqual(['Alice', 'Charlie']);
  });

  it('ignores empty vehicle strings', () => {
    expect(buildVehicleCustomerIndex([{ vehicle: '   ', customer: 'X' }])).toEqual([]);
  });

  it('uses Unknown customer when name missing', () => {
    const rows = buildVehicleCustomerIndex([{ vehicle: 'XL1200', customerId: 'x' }]);
    expect(rows[0]?.customers[0]?.displayName).toBe('Unknown customer');
    expect(rows[0]?.customers[0]?.customerId).toBe('x');
  });
});
