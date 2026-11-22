import { describe, it, expect } from 'vitest';
import { shopHoursSchema, tenantSchema, type ShopHours, type Tenant } from './tenant';
import { DEFAULT_SHOP_HOURS } from './shop-hours';

describe('Tenant Schema Validation', () => {
  describe('shopHoursSchema', () => {
    it('should validate correct shop hours', () => {
      const validShopHours: ShopHours = {
        daysOpen: [1, 2, 3, 4, 5], // Monday to Friday
        openHour: 9,
        closeHour: 18,
      };

      const result = shopHoursSchema.safeParse(validShopHours);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validShopHours);
      }
    });

    it('should validate weekend shop hours', () => {
      const weekendHours: ShopHours = {
        daysOpen: [0, 6], // Sunday and Saturday
        openHour: 10,
        closeHour: 16,
      };

      const result = shopHoursSchema.safeParse(weekendHours);
      expect(result.success).toBe(true);
    });

    it('should reject overnight shop hours (closeHour before openHour)', () => {
      const overnightHours = {
        daysOpen: [5, 6], // Friday and Saturday
        openHour: 22,
        closeHour: 6, // Next day (not allowed by current schema)
      };

      const result = shopHoursSchema.safeParse(overnightHours);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Closing hour must be after opening hour.');
      }
    });

    it('should reject empty daysOpen array', () => {
      const invalidHours = {
        daysOpen: [],
        openHour: 9,
        closeHour: 18,
      };

      const result = shopHoursSchema.safeParse(invalidHours);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('At least one day must be selected.');
      }
    });

    it('should reject invalid day numbers', () => {
      const invalidHours = {
        daysOpen: [8], // Invalid day (> 6)
        openHour: 9,
        closeHour: 18,
      };

      const result = shopHoursSchema.safeParse(invalidHours);
      expect(result.success).toBe(false);
    });

    it('should reject invalid hour ranges', () => {
      const invalidHours = {
        daysOpen: [1, 2, 3, 4, 5],
        openHour: 25, // Invalid hour (> 23)
        closeHour: 18,
      };

      const result = shopHoursSchema.safeParse(invalidHours);
      expect(result.success).toBe(false);
    });

    it('should reject when closeHour equals openHour', () => {
      const invalidHours = {
        daysOpen: [1, 2, 3, 4, 5],
        openHour: 9,
        closeHour: 9, // Same as openHour
      };

      const result = shopHoursSchema.safeParse(invalidHours);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Closing hour must be after opening hour.');
      }
    });

    it('should reject when closeHour is before openHour (no overnight)', () => {
      const invalidHours = {
        daysOpen: [1, 2, 3, 4, 5],
        openHour: 18,
        closeHour: 9, // Before openHour
      };

      const result = shopHoursSchema.safeParse(invalidHours);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Closing hour must be after opening hour.');
      }
    });
  });

  describe('tenantSchema', () => {
    it('should validate tenant with valid shop hours', () => {
      const validTenant: Omit<Tenant, '_id'> = {
        name: 'Test Business',
        tier: 'customer',
        trial: true,
        phone: '555-1234',
        email: 'test@business.com',
        active: true,
        shopHours: DEFAULT_SHOP_HOURS,
        observedHolidayIds: [],
        shopClosedDates: [],
        recurringScheduleBlocks: [],
      };

      const result = tenantSchema.safeParse(validTenant);
      expect(result.success).toBe(true);
    });

    it('should apply default shop hours when not provided', () => {
      const tenantWithoutShopHours = {
        name: 'Test Business',
        tier: 'customer',
        phone: '555-1234',
        email: 'test@business.com',
        active: true,
      };

      const result = tenantSchema.safeParse(tenantWithoutShopHours);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.shopHours).toEqual(DEFAULT_SHOP_HOURS);
      }
    });

    it('should reject tenant with invalid shop hours', () => {
      const invalidTenant = {
        name: 'Test Business',
        tier: 'customer',
        shopHours: {
          daysOpen: [], // Invalid: empty array
          openHour: 9,
          closeHour: 18,
        },
      };

      const result = tenantSchema.safeParse(invalidTenant);
      expect(result.success).toBe(false);
    });

    it('should reject tenant with too short name', () => {
      const invalidTenant = {
        name: 'A', // Too short
        tier: 'customer',
        shopHours: DEFAULT_SHOP_HOURS,
      };

      const result = tenantSchema.safeParse(invalidTenant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Tenant name must be at least 2 characters.');
      }
    });

    it('should reject tenant with invalid email', () => {
      const invalidTenant = {
        name: 'Test Business',
        tier: 'customer',
        email: 'not-an-email', // Invalid email
        shopHours: DEFAULT_SHOP_HOURS,
      };

      const result = tenantSchema.safeParse(invalidTenant);
      expect(result.success).toBe(false);
    });

    it('should accept optional billing snapshot fields', () => {
      const withBilling: Omit<Tenant, '_id'> = {
        name: 'Test Business',
        tier: 'customer',
        trial: false,
        active: true,
        shopHours: DEFAULT_SHOP_HOURS,
        observedHolidayIds: [],
        shopClosedDates: [],
        recurringScheduleBlocks: [],
        stripePriceId: 'price_test123',
        stripeCustomerId: 'cus_test',
        stripeSubscriptionId: 'sub_test',
        subscriptionStatus: 'active',
      };

      const result = tenantSchema.safeParse(withBilling);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stripePriceId).toBe('price_test123');
        expect(result.data.stripeCustomerId).toBe('cus_test');
        expect(result.data.subscriptionStatus).toBe('active');
        expect(result.data.subscriptionCurrentPeriodEnd).toBeUndefined();
      }
    });

    it('should accept subscriptionCurrentPeriodEnd when present', () => {
      const withPeriod = {
        name: 'Test Business',
        tier: 'customer' as const,
        shopHours: DEFAULT_SHOP_HOURS,
        subscriptionCurrentPeriodEnd: '2026-05-01T12:00:00.000Z',
      };

      const result = tenantSchema.safeParse(withPeriod);
      expect(result.success).toBe(true);
    });

    it('should default observedHolidayIds and shopClosedDates to empty', () => {
      const minimal = {
        name: 'Test Business',
        tier: 'customer' as const,
        shopHours: DEFAULT_SHOP_HOURS,
      };
      const parsed = tenantSchema.safeParse(minimal);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.observedHolidayIds).toEqual([]);
        expect(parsed.data.shopClosedDates).toEqual([]);
      }

      const withHolidays = {
        ...minimal,
        observedHolidayIds: ['us-new-years-day', 'us-christmas'] as const,
      };
      const withResult = tenantSchema.safeParse(withHolidays);
      expect(withResult.success).toBe(true);
    });
  });

  describe('DEFAULT_SHOP_HOURS integration', () => {
    it('should be valid according to shopHoursSchema', () => {
      const result = shopHoursSchema.safeParse(DEFAULT_SHOP_HOURS);
      expect(result.success).toBe(true);
    });

    it('should have expected default values', () => {
      expect(DEFAULT_SHOP_HOURS).toEqual({
        daysOpen: [1, 2, 3, 4, 5], // Monday to Friday
        openHour: 9,
        closeHour: 18,
      });
    });
  });
});
