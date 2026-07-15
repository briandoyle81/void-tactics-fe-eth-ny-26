"use client";

import React from "react";

interface ManageNavyShipsCountHeadingProps {
  shownCount: number;
  totalCount: number;
  perPage: number;
  page: number;
}

export const ManageNavyShipsCountHeading: React.FC<ManageNavyShipsCountHeadingProps> = ({
  shownCount,
  totalCount,
  perPage,
  page,
}) => {
  const rangeLabel =
    shownCount > perPage
      ? `${page * perPage + 1}–${Math.min((page + 1) * perPage, shownCount)} of ${shownCount}`
      : shownCount;

  return (
    <h4
      className="min-w-0 text-base font-bold sm:text-xl"
      style={{
        fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
        color: "var(--color-text-primary)",
      }}
    >
      [YOUR SHIPS] - Showing {rangeLabel} of {totalCount} ships
    </h4>
  );
};
