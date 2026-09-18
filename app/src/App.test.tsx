import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("muestra siempre el distintivo de borrador no validado", () => {
    render(<App />);

    expect(screen.getByText("Borrador no validado")).toBeVisible();
  });

  it("expone un encabezado principal", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
  });

  it("no escribe nada en el almacenamiento del navegador", () => {
    render(<App />);

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
