-- AlterEnum: Rename Position enum values from LONG/SHORT to BELI/JUAL
-- This requires creating a new enum type and migrating data

-- Create new enum type
CREATE TYPE "Position_new" AS ENUM ('BELI', 'JUAL');

-- Update Trade table to use temporary text column
ALTER TABLE "Trade" ADD COLUMN "position_new" TEXT;

-- Copy and transform data
UPDATE "Trade"
SET "position_new" = CASE
  WHEN "position"::text = 'LONG' THEN 'BELI'
  WHEN "position"::text = 'SHORT' THEN 'JUAL'
  ELSE "position"::text
END;

-- Drop old column
ALTER TABLE "Trade" DROP COLUMN "position";

-- Rename new column
ALTER TABLE "Trade" RENAME COLUMN "position_new" TO "position";

-- Convert to new enum type
ALTER TABLE "Trade"
ALTER COLUMN "position" TYPE "Position_new" USING "position"::"Position_new";

-- Drop old enum
DROP TYPE "Position";

-- Rename new enum to original name
ALTER TYPE "Position_new" RENAME TO "Position";
