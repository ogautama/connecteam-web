/*
  Warnings:

  - You are about to drop the column `bankAccount` on the `MemberIntake` table. All the data in the column will be lost.
  - You are about to drop the column `npwp` on the `MemberIntake` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `MemberIntake` table. All the data in the column will be lost.
  - Added the required column `activeEmail` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `activePhone` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthPlace` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `education` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `familyCardPhotoKey` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `graduationYear` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ktpPhotoKey` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pengundangUnit` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `savingsPhotoKey` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolName` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selfiePhotoKey` to the `MemberIntake` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('smaSltaSmk', 's1', 's2', 's3');

-- AlterTable
ALTER TABLE "MemberIntake" DROP COLUMN "bankAccount",
DROP COLUMN "npwp",
DROP COLUMN "phone",
ADD COLUMN     "activeEmail" TEXT NOT NULL,
ADD COLUMN     "activePhone" TEXT NOT NULL,
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "birthPlace" TEXT NOT NULL,
ADD COLUMN     "education" "EducationLevel" NOT NULL,
ADD COLUMN     "familyCardPhotoKey" TEXT NOT NULL,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "graduationYear" TEXT NOT NULL,
ADD COLUMN     "ktpPhotoKey" TEXT NOT NULL,
ADD COLUMN     "pengundangUnit" TEXT NOT NULL,
ADD COLUMN     "savingsPhotoKey" TEXT NOT NULL,
ADD COLUMN     "schoolName" TEXT NOT NULL,
ADD COLUMN     "selfiePhotoKey" TEXT NOT NULL,
ADD COLUMN     "spousePhotoKey" TEXT;
