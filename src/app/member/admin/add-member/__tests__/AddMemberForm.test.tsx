import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

const { addMember } = vi.hoisted(() => ({ addMember: vi.fn() }));

// The real action pulls in Prisma via requireRole/createPendingInvite — this
// suite is about the UI.
vi.mock("../actions", () => ({ addMember }));

import AddMemberForm from "../AddMemberForm";

const recruiters = [
  { id: "user_1", name: "Budi Santoso", email: "budi@example.com" },
  { id: "user_2", name: "Rani Putri", email: "rani@example.com" },
];

function renderForm() {
  return render(
    <AddMemberForm recruiters={recruiters} defaultRecruiterId="user_1" />,
  );
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Undang member" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  addMember.mockResolvedValue({ status: "idle" });
});

describe("AddMemberForm", () => {
  test("leans on the browser for the first pass of email validation", () => {
    renderForm();

    const email = screen.getByLabelText("Email");
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("type", "email");
  });

  test("defaults to the acting leader as recruiter, with a code fallback", () => {
    renderForm();

    expect(screen.getByLabelText("Recruiter")).toHaveValue("user_1");
    expect(screen.getByLabelText("Kode referral recruiter")).toHaveValue("");
    expect(screen.getByLabelText("Role")).toHaveValue("agent");
  });

  test("marks the acting leader in the recruiter list", () => {
    renderForm();

    const options = within(screen.getByLabelText("Recruiter")).getAllByRole(
      "option",
    );
    expect(options.map((option) => option.textContent)).toEqual([
      "Kamu — Budi Santoso — budi@example.com",
      "Rani Putri — rani@example.com",
      "Pakai kode referral di bawah",
    ]);
  });

  test("submits what the leader filled in", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "baru@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Recruiter"), {
      target: { value: "user_2" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "leader" },
    });
    submit();

    await waitFor(() => expect(addMember).toHaveBeenCalled());
    const formData = addMember.mock.calls[0][1] as FormData;
    expect(formData.get("email")).toBe("baru@example.com");
    expect(formData.get("recruiterId")).toBe("user_2");
    expect(formData.get("role")).toBe("leader");
  });

  test("shows a duplicate-email error inline instead of blowing up", async () => {
    addMember.mockResolvedValue({
      status: "error",
      message: "Email ini udah punya akun. Nggak perlu diundang lagi.",
    });
    renderForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "budi@example.com" },
    });
    submit();

    expect(await screen.findByText(/udah punya akun/i)).toBeInTheDocument();
    // The form stays put so the leader can fix the email and resubmit.
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  test("confirms a successful invite and can reset for the next one", async () => {
    addMember.mockResolvedValue({
      status: "success",
      email: "baru@example.com",
    });
    renderForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "baru@example.com" },
    });
    submit();

    expect(
      await screen.findByRole("heading", {
        name: /baru@example.com udah diundang/,
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tambah member lagi" }));

    expect(screen.getByLabelText("Email")).toHaveValue("");
  });
});
