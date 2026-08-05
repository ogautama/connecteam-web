-- CreateTable
CREATE TABLE "MemberIntake" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ktpNumber" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "npwp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberIntake_userId_key" ON "MemberIntake"("userId");

-- AddForeignKey
ALTER TABLE "MemberIntake" ADD CONSTRAINT "MemberIntake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
