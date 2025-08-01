-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);
