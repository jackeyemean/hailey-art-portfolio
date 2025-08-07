-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "isCollectionPick" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viewOrder" INTEGER;
