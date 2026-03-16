-- Clean up price values: remove currency symbols and set defaults for null/empty
UPDATE "Event" SET price = REPLACE(REPLACE(price, '£', ''), '$', '') WHERE price IS NOT NULL AND price != '';
UPDATE "Event" SET price = '0' WHERE price IS NULL OR price = '' OR price ~ '^[^0-9.]*$';

-- AlterTable - change price from String to Decimal
ALTER TABLE "Event" ALTER COLUMN "price" TYPE DECIMAL(10,2) USING
  CASE
    WHEN price ~ '^[0-9]+(\.[0-9]+)?$' THEN price::DECIMAL(10,2)
    ELSE 0.00
  END;
