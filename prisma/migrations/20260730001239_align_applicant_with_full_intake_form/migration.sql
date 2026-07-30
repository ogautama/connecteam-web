/*
  Warnings:

  - You are about to drop the column `dob` on the `Applicant` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Applicant` table. All the data in the column will be lost.
  - You are about to drop the column `idCardPhotoKey` on the `Applicant` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Applicant` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Applicant` table. All the data in the column will be lost.
  - Added the required column `activeEmail` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `activePhone` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthDate` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthPlace` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `education` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `familyCardPhotoKey` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `graduationYear` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ktpNumber` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ktpPhotoKey` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `savingsPhotoKey` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolName` to the `Applicant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selfiePhotoKey` to the `Applicant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Applicant" DROP COLUMN "dob",
DROP COLUMN "email",
DROP COLUMN "idCardPhotoKey",
DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "activeEmail" TEXT NOT NULL,
ADD COLUMN     "activePhone" TEXT NOT NULL,
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "birthDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "birthPlace" TEXT NOT NULL,
ADD COLUMN     "education" "EducationLevel" NOT NULL,
ADD COLUMN     "familyCardPhotoKey" TEXT NOT NULL,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "graduationYear" TEXT NOT NULL,
ADD COLUMN     "ktpNumber" TEXT NOT NULL,
ADD COLUMN     "ktpPhotoKey" TEXT NOT NULL,
ADD COLUMN     "savingsPhotoKey" TEXT NOT NULL,
ADD COLUMN     "schoolName" TEXT NOT NULL,
ADD COLUMN     "selfiePhotoKey" TEXT NOT NULL,
ADD COLUMN     "spousePhotoKey" TEXT;
