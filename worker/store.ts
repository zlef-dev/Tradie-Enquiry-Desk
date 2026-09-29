import { template } from "./ai";
import {
  sampleEnquiry,
  type Enquiry,
  type EnquiryInput,
  type Status,
} from "../shared/domain";

export interface Workspace {
  id: string;
  offset_ms: number;
}
export interface Row {
  id: string;
  input: string;
  status: Status;
  sample: number;
  created_at: string;
  updated_at: string;
  draft: string;
  draft_edited: number;
  analysis: string | null;
  analysis_status: string;
  analysis_error: string | null;
  analysis_started: number | null;
  attempts: number;
}
export const uid = () => crypto.randomUUID();
export const nowFor = (workspace: Workspace) =>
  new Date(Date.now() + workspace.offset_ms).toISOString();
export function unpack(row: Row): Enquiry {
  return {
    id: row.id,
    input: JSON.parse(row.input),
    status: row.status,
    sample: !!row.sample,
    created_at: row.created_at,
    updated_at: row.updated_at,
    draft: row.draft,
    draft_edited: !!row.draft_edited,
    analysis: row.analysis ? JSON.parse(row.analysis) : null,
    analysis_status: row.analysis_status,
    analysis_error: row.analysis_error,
  };
}
export function event(
  db: D1Database,
  ws: string,
  id: string,
  kind: string,
  detail: string,
  time: string,
) {
  return db
    .prepare(
      "INSERT INTO events(id,workspace_id,enquiry_id,kind,detail,created_at) VALUES(?,?,?,?,?,?)",
    )
    .bind(uid(), ws, id, kind, detail, time);
}

export function seedStatements(db: D1Database, ws: string, time: string) {
  const entries: {
    name: string;
    status: Status;
    service: EnquiryInput["service"];
    suburb: string;
    description: string;
    availability: string;
  }[] = [
    {
      name: "Jamie Taylor",
      status: "New",
      service: "Tap repairs",
      suburb: "Carina",
      description:
        "The bathroom tap drips after it is turned off. Could someone take a look?",
      availability: "Weekday mornings",
    },
    {
      name: "Sam Lee",
      status: "Needs details",
      service: "Not sure",
      suburb: "Camp Hill",
      description:
        "There is an odd plumbing issue in our laundry. I am not sure what information you need.",
      availability: "",
    },
    {
      name: "Charlie Evans",
      status: "Ready for quote",
      service: "Toilet repairs",
      suburb: "Carindale",
      description:
        "The toilet keeps running after flushing. Looking for help with a repair.",
      availability: "Tuesday afternoon",
    },
    {
      name: "Jordan Chen",
      status: "Quote sent",
      service: "Maintenance",
      suburb: "Coorparoo",
      description:
        "Please inspect the taps and toilets during a routine maintenance visit.",
      availability: "Next week",
    },
    {
      name: "Riley Park",
      status: "New",
      service: "Leak inspection",
      suburb: "Ipswich",
      description:
        "There is dampness under the kitchen sink. Do you cover our suburb?",
      availability: "Thursday morning",
    },
    {
      name: "Casey Brown",
      status: "Won",
      service: "Tap repairs",
      suburb: "Holland Park",
      description: "I would like help with a loose mixer tap in the bathroom.",
      availability: "Monday morning",
    },
  ];
  return entries.flatMap((item, index) => {
    const id = uid();
    const input: EnquiryInput = {
      ...sampleEnquiry,
      ...item,
      email: `sample${index + 1}@example.com`,
      contact: "email",
      phone: "",
      postcode: "",
    };
    // status belongs to the enquiry, not its original form fields.
    const { status: _status, ...form } = input as EnquiryInput & {
      status: Status;
    };
    const analysis = template(form);
    const created = new Date(
      Date.parse(time) - (index + 1) * 3600000,
    ).toISOString();
    const statements = [
      db
        .prepare(
          "INSERT INTO enquiries(id,workspace_id,input,status,sample,created_at,updated_at,draft,analysis,analysis_status,submission_key) VALUES(?,?,?,?,1,?,?,?,?,?,?)",
        )
        .bind(
          id,
          ws,
          JSON.stringify(form),
          item.status,
          created,
          created,
          analysis.reply,
          JSON.stringify(analysis),
          "complete",
          `seed-${index}`,
        ),
      event(
        db,
        ws,
        id,
        "sample",
        "Fictional sample enquiry added to your demo.",
        created,
      ),
    ];
    if (item.status === "Quote sent")
      statements.push(
        db
          .prepare(
            "INSERT INTO tasks(id,workspace_id,enquiry_id,due_at,state,created_at) VALUES(?,?,?,?,'open',?)",
          )
          .bind(
            uid(),
            ws,
            id,
            new Date(Date.parse(time) + 86400000).toISOString(),
            created,
          ),
        event(
          db,
          ws,
          id,
          "sample",
          "Sample quote status recorded manually; no quote was generated or sent.",
          created,
        ),
      );
    return statements;
  });
}
