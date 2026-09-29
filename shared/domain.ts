import { z } from "zod";

export const services = [
  "Tap repairs",
  "Toilet repairs",
  "Leak inspection",
  "Maintenance",
  "Not sure",
] as const;
export const statuses = [
  "New",
  "Needs details",
  "Ready for quote",
  "Quote sent",
  "Won",
  "Closed",
] as const;
export type Status = (typeof statuses)[number];
export const suburbs = [
  "Carindale",
  "Carina",
  "Camp Hill",
  "Coorparoo",
  "Holland Park",
  "Mount Gravatt",
];
const phone = z
  .string()
  .trim()
  .max(30)
  .refine(
    (v) =>
      !v ||
      (/^(?:\+61|0)[\d ()-]{8,18}$/.test(v) &&
        v.replace(/\D/g, "").length >= 10),
    "Enter a valid Australian phone number.",
  );
export const enquirySchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80),
    email: z.string().trim().email("Enter a valid email address.").max(160),
    phone,
    contact: z.enum(["email", "phone", "text"]),
    suburb: z.string().trim().min(2, "Enter a suburb.").max(80),
    postcode: z
      .string()
      .trim()
      .regex(/^(\d{4})?$/, "Use a four-digit postcode."),
    service: z.enum(services),
    description: z
      .string()
      .trim()
      .min(10, "Tell us a little more (at least 10 characters).")
      .max(3000),
    availability: z.string().trim().max(200),
  })
  .strict()
  .refine((v) => v.contact === "email" || !!v.phone, {
    path: ["phone"],
    message: "A phone number is required for phone or text contact.",
  });
export type EnquiryInput = z.infer<typeof enquirySchema>;
export const sampleEnquiry: EnquiryInput = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  phone: "0400 000 000",
  contact: "text",
  suburb: "Carindale",
  postcode: "4152",
  service: "Tap repairs",
  description:
    "Hi, the kitchen tap’s been dripping since Sunday. We’re in Carindale. Can someone come Friday after 2? Please text first.",
  availability: "Friday after 2",
};
export const serviceArea = (suburb: string) =>
  suburbs.some((s) => s.toLowerCase() === suburb.trim().toLowerCase());
export const followUpDue = (now: string) =>
  new Date(Date.parse(now) + 48 * 60 * 60 * 1000).toISOString();
export const terminal = (status: Status) =>
  status === "Won" || status === "Closed";
export const aiSchema = z
  .object({
    summary: z.string().min(1).max(600),
    service: z.enum(services),
    details: z.array(z.string().min(1).max(400)).max(8),
    missing: z.array(z.string().min(1).max(200)).max(6),
    reply: z.string().min(1).max(2000),
  })
  .strict();
export type Analysis = z.infer<typeof aiSchema> & { mode: "template" | "live" };
export interface Enquiry {
  id: string;
  input: EnquiryInput;
  status: Status;
  sample: boolean;
  created_at: string;
  updated_at: string;
  draft: string;
  draft_edited: boolean;
  analysis: Analysis | null;
  analysis_status: string;
  analysis_error: string | null;
}
export interface Task {
  id: string;
  enquiry_id: string;
  due_at: string;
  state: "open" | "completed" | "cancelled";
}
export interface Outbox {
  id: string;
  enquiry_id: string;
  body: string;
  channel: string;
  recipient: string;
  created_at: string;
}
export interface Activity {
  id: string;
  kind: string;
  detail: string;
  created_at: string;
}
export interface Dashboard {
  enquiries: Enquiry[];
  tasks: Task[];
  outbox: Outbox[];
  now: string;
  offset: number;
  mode: "template" | "live";
  aiConnected: boolean;
}
export interface Detail {
  enquiry: Enquiry;
  tasks: Task[];
  events: Activity[];
  outbox: Outbox[];
  now: string;
  offset: number;
  mode: "template" | "live";
  aiConnected: boolean;
}
