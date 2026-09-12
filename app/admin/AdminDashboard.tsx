"use client";

import { useState } from "react";

import CategoryManager from "./CategoryManager";
import CategoryList from "./CategoryList";
import ProductManager from "./ProductManager";
import TableManager from "./TableManager";
import OrderRealtime from "./OrderRealtime";
import ShiftManager from "./ShiftManager";
import ShiftHistory from "./ShiftHistory";

type Category = {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
};

type Product = {
  id: number;
  name: string;
  description: string | null;
  category_id: number;
  image_url: string | null;
  ingredients: string | null;
  price: number;
  is_available: boolean;
  sort_order: number;
};

type Table = {
  id: number;
  number: number;
  created_at: string;
};

type Props = {
  userEmail: string;

  categories: Category[];
  products: Product[];
  tables: Table[];

  categoryError: string | null;
  productError: string | null;
  tableError: string | null;
};

type MainView =
  | "orders"
  | "cocktails"
  | "shift"
  | "management";

type ManagementView =
  | "category"
  | "cocktail"
  | "table";

export default function AdminDashboard({
  userEmail,
  categories,
  products,
  tables,
  categoryError,
  productError,
  tableError,
}: Props) {
  const [mainView, setMainView] =
    useState<MainView>("orders");

  const [managementView, setManagementView] =
    useState<ManagementView>("cocktail");

  function openManagement(
    section: ManagementView
  ) {
    setManagementView(section);
    setMainView("management");
  }

  return (
    <div className="min-h-screen bg-zinc-950">

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <header className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              CLIQUE ADMIN
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Нэвтэрсэн: {userEmail}
            </p>
          </div>

          <div className="flex items-center gap-3">

            {/* SHIFT STATUS */}

            <div className="hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 sm:flex">
              <span>●</span>
              <span>Ээлж нээлттэй</span>
            </div>

          </div>

        </div>
      </header>


      {/* ===================================================== */}
      {/* MAIN */}
      {/* ===================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">

        {/* =================================================== */}
        {/* NAVIGATION */}
        {/* =================================================== */}

        <div className="mb-8">

          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Үндсэн цэс
            </p>
          </div>


          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

            {/* ================================================= */}
            {/* ORDERS */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={() =>
                setMainView("orders")
              }
              className={`
                group rounded-2xl border p-5 text-left transition-all
                ${
                  mainView === "orders"
                    ? "border-white/20 bg-white text-zinc-950 shadow-lg"
                    : "border-white/10 bg-zinc-900 text-white hover:border-white/20 hover:bg-zinc-800"
                }
              `}
            >
              <div className="mb-4 text-3xl">
                🧾
              </div>

              <div className="text-base font-bold">
                Захиалгууд
              </div>

              <div
                className={`
                  mt-1 text-xs
                  ${
                    mainView === "orders"
                      ? "text-zinc-500"
                      : "text-zinc-500"
                  }
                `}
              >
                Үндсэн дэлгэц
              </div>
            </button>


            {/* ================================================= */}
            {/* COCKTAIL */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={() =>
                setMainView("cocktails")
              }
              className={`
                group rounded-2xl border p-5 text-left transition-all
                ${
                  mainView === "cocktails"
                    ? "border-white/20 bg-white text-zinc-950 shadow-lg"
                    : "border-white/10 bg-zinc-900 text-white hover:border-white/20 hover:bg-zinc-800"
                }
              `}
            >
              <div className="mb-4 text-3xl">
                🍹
              </div>

              <div className="text-base font-bold">
                Cocktail
              </div>

              <div
                className={`
                  mt-1 text-xs
                  ${
                    mainView === "cocktails"
                      ? "text-zinc-500"
                      : "text-zinc-500"
                  }
                `}
              >
                Cocktail жагсаалт
              </div>
            </button>


            {/* ================================================= */}
            {/* SHIFT + HISTORY */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={() =>
                setMainView("shift")
              }
              className={`
                group rounded-2xl border p-5 text-left transition-all
                ${
                  mainView === "shift"
                    ? "border-white/20 bg-white text-zinc-950 shadow-lg"
                    : "border-white/10 bg-zinc-900 text-white hover:border-white/20 hover:bg-zinc-800"
                }
              `}
            >
              <div className="mb-4 text-3xl">
                🕐
              </div>

              <div className="text-base font-bold">
                Ээлж & Түүх
              </div>

              <div
                className={`
                  mt-1 text-xs
                  ${
                    mainView === "shift"
                      ? "text-zinc-500"
                      : "text-zinc-500"
                  }
                `}
              >
                Ээлжийн мэдээлэл
              </div>
            </button>


            {/* ================================================= */}
            {/* MANAGEMENT */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={() =>
                openManagement("cocktail")
              }
              className={`
                group rounded-2xl border p-5 text-left transition-all
                ${
                  mainView === "management"
                    ? "border-white/20 bg-white text-zinc-950 shadow-lg"
                    : "border-white/10 bg-zinc-900 text-white hover:border-white/20 hover:bg-zinc-800"
                }
              `}
            >
              <div className="mb-4 text-3xl">
                ⚙️
              </div>

              <div className="text-base font-bold">
                Удирдлага
              </div>

              <div
                className={`
                  mt-1 text-xs
                  ${
                    mainView === "management"
                      ? "text-zinc-500"
                      : "text-zinc-500"
                  }
                `}
              >
                Системийн тохиргоо
              </div>
            </button>

          </div>
        </div>


        {/* =================================================== */}
        {/* CONTENT */}
        {/* =================================================== */}

        <div>

          {/* ================================================= */}
          {/* ORDERS - MAIN SCREEN */}
          {/* ================================================= */}

          {mainView === "orders" && (
            <section>

              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white">
                  🧾 Захиалгууд
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Одоогийн идэвхтэй захиалгууд
                </p>
              </div>

              <OrderRealtime />

            </section>
          )}


          {/* ================================================= */}
          {/* COCKTAIL LIST */}
          {/* ================================================= */}

          {mainView === "cocktails" && (
            <section>

              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white">
                  🍹 Cocktail
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Cocktail бүтээгдэхүүнүүд
                </p>
              </div>


              {productError && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  Cocktail уншихад алдаа гарлаа:
                  <br />
                  {productError}
                </div>
              )}


              <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">

                <ProductManager
                  categories={categories.map(
                    (category) => ({
                      id: category.id,
                      name: category.name,
                    })
                  )}
                  products={products}
                />

              </div>

            </section>
          )}


          {/* ================================================= */}
          {/* SHIFT + HISTORY */}
          {/* ================================================= */}

          {mainView === "shift" && (
            <section>

              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white">
                  🕐 Ээлж & Түүх
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Ээлж нээх, хаах болон өмнөх ээлжүүд
                </p>
              </div>


              <div className="space-y-6">

                {/* CURRENT SHIFT */}

                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">

                  <div className="mb-5">
                    <h3 className="text-lg font-semibold text-white">
                      🕐 Одоогийн ээлж
                    </h3>
                  </div>

                  <ShiftManager />

                </div>


                {/* HISTORY */}

                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">

                  <div className="mb-5">
                    <h3 className="text-lg font-semibold text-white">
                      📋 Ээлжийн түүх
                    </h3>
                  </div>

                  <ShiftHistory />

                </div>

              </div>

            </section>
          )}


          {/* ================================================= */}
          {/* MANAGEMENT */}
          {/* ================================================= */}

          {mainView === "management" && (
            <section>

              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white">
                  ⚙️ Удирдлага
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Ангилал, cocktail болон ширээний тохиргоо
                </p>
              </div>


              {/* ============================================= */}
              {/* MANAGEMENT NAVIGATION */}
              {/* ============================================= */}

              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

                {/* CATEGORY */}

                <button
                  type="button"
                  onClick={() =>
                    setManagementView("category")
                  }
                  className={`
                    rounded-xl border p-4 text-left transition
                    ${
                      managementView === "category"
                        ? "border-white/20 bg-white text-zinc-950"
                        : "border-white/10 bg-zinc-900 text-white hover:bg-zinc-800"
                    }
                  `}
                >
                  <div className="text-2xl">
                    🏷️
                  </div>

                  <div className="mt-2 font-semibold">
                    Ангилал
                  </div>

                  <div
                    className={`
                      mt-1 text-xs
                      ${
                        managementView === "category"
                          ? "text-zinc-500"
                          : "text-zinc-500"
                      }
                    `}
                  >
                    Ангилал удирдах
                  </div>
                </button>


                {/* COCKTAIL */}

                <button
                  type="button"
                  onClick={() =>
                    setManagementView("cocktail")
                  }
                  className={`
                    rounded-xl border p-4 text-left transition
                    ${
                      managementView === "cocktail"
                        ? "border-white/20 bg-white text-zinc-950"
                        : "border-white/10 bg-zinc-900 text-white hover:bg-zinc-800"
                    }
                  `}
                >
                  <div className="text-2xl">
                    🍸
                  </div>

                  <div className="mt-2 font-semibold">
                    Cocktail нэмэх
                  </div>

                  <div
                    className={`
                      mt-1 text-xs
                      ${
                        managementView === "cocktail"
                          ? "text-zinc-500"
                          : "text-zinc-500"
                      }
                    `}
                  >
                    Cocktail удирдах
                  </div>
                </button>


                {/* TABLE */}

                <button
                  type="button"
                  onClick={() =>
                    setManagementView("table")
                  }
                  className={`
                    rounded-xl border p-4 text-left transition
                    ${
                      managementView === "table"
                        ? "border-white/20 bg-white text-zinc-950"
                        : "border-white/10 bg-zinc-900 text-white hover:bg-zinc-800"
                    }
                  `}
                >
                  <div className="text-2xl">
                    🪑
                  </div>

                  <div className="mt-2 font-semibold">
                    Ширээ
                  </div>

                  <div
                    className={`
                      mt-1 text-xs
                      ${
                        managementView === "table"
                          ? "text-zinc-500"
                          : "text-zinc-500"
                      }
                    `}
                  >
                    Ширээний удирдлага
                  </div>
                </button>

              </div>


              {/* ============================================= */}
              {/* CATEGORY MANAGEMENT */}
              {/* ============================================= */}

              {managementView === "category" && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white">
                      🏷️ Ангилал
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      Menu-ийн бүтээгдэхүүний ангиллууд
                    </p>
                  </div>


                  {categoryError && (
                    <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                      Ангилал уншихад алдаа гарлаа:
                      <br />
                      {categoryError}
                    </div>
                  )}


                  <CategoryManager />


                  <div className="mt-6 border-t border-white/10 pt-6">

                    <CategoryList
                      categories={categories}
                    />

                  </div>

                </div>
              )}


              {/* ============================================= */}
              {/* COCKTAIL MANAGEMENT */}
              {/* ============================================= */}

              {managementView === "cocktail" && (
                <div>

                  <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">

                    {productError && (
                      <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                        Cocktail уншихад алдаа гарлаа:
                        <br />
                        {productError}
                      </div>
                    )}


                    <ProductManager
                      categories={categories.map(
                        (category) => ({
                          id: category.id,
                          name: category.name,
                        })
                      )}
                      products={products}
                    />

                  </div>

                </div>
              )}


              {/* ============================================= */}
              {/* TABLE MANAGEMENT */}
              {/* ============================================= */}

              {managementView === "table" && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white">
                      🪑 Ширээний удирдлага
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      Ширээ нэмэх, устгах
                    </p>
                  </div>


                  {tableError && (
                    <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                      Ширээ уншихад алдаа гарлаа:
                      <br />
                      {tableError}
                    </div>
                  )}


                  <TableManager
                    tables={tables}
                  />

                </div>
              )}

            </section>
          )}

        </div>

      </main>

    </div>
  );
}