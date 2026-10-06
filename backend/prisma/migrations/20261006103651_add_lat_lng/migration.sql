/*
  Warnings:

  - Added the required column `latitude` to the `store_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `store_addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "store_addresses" ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL;
