-- AlterEnum: Add ARBEITNOW value to JobSource
-- This is a safe, non-destructive operation — existing rows are unaffected.
ALTER TYPE "JobSource" ADD VALUE 'ARBEITNOW';
