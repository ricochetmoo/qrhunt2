import { z } from "zod";

/** Optional free text; empty strings become null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value));

const decimalString = z.string().trim().regex(/^-?\d+(\.\d+)?$/, "Must be a decimal number.");

/**
 * Optional coordinate kept as a decimal string (the columns are `text`).
 * Empty form input is treated as "not set".
 */
export const coordinate = (min: number, max: number, label: string) =>
  decimalString
    .refine((value) => {
      const n = Number(value);
      return n >= min && n <= max;
    }, `${label} must be between ${min} and ${max}.`)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null));

export const latitude = () => coordinate(-90, 90, "Latitude");
export const longitude = () => coordinate(-180, 180, "Longitude");
