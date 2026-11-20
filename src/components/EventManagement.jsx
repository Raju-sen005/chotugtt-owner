import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { hasEventManagementAccess } from "../features/events/eventsAccess";
import { displayPhone } from "../utils/displayText";

const API_BASE = (import.meta.env.VITE_APP_API_BASE || "").replace(/\/+$/, "");

const apiConfig = { withCredentials: true };

// These values must match Event.EVENT_TYPES on the backend exactly.
const EVENT_TYPES = [
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "ANNIVERSARY", label: "Anniversary" },
  { value: "KITTY_PARTY", label: "Kitty Party" },
  { value: "RING_CEREMONY", label: "Ring Ceremony" },
  { value: "CORPORATE_MEET", label: "Corporate Meet" },
  { value: "WEDDING", label: "Wedding" },
  { value: "CONFERENCE", label: "Conference" },
  { value: "MEETING", label: "Meeting" },
  { value: "OTHER", label: "Other" },
];

const EVENT_TYPE_ALIASES = {
  Birthday: "BIRTHDAY",
  Anniversary: "ANNIVERSARY",
  "Kitty Party": "KITTY_PARTY",
  Engagement: "RING_CEREMONY",
  "Ring Ceremony": "RING_CEREMONY",
  "Corporate Event": "CORPORATE_MEET",
  "Corporate Meet": "CORPORATE_MEET",
  Wedding: "WEDDING",
  Conference: "CONFERENCE",
  Meeting: "MEETING",
  Other: "OTHER",
};

const normalizeEventType = (value) => {
  if (EVENT_TYPE_ALIASES[value]) return EVENT_TYPE_ALIASES[value];
  return EVENT_TYPES.some((item) => item.value === value) ? value : "OTHER";
};
const eventTypeLabel = (value) =>
  EVENT_TYPES.find((item) => item.value === normalizeEventType(value))?.label ||
  "Other";
const normalizeMenuType = (value, source = "CUSTOM") => {
  if (value === "FIXED_PACKAGE")
    return source === "PACKAGE" ? "PACKAGE" : "CUSTOM";
  if (["PACKAGE", "CUSTOM", "BUFFET", "PLATED", "OTHER"].includes(value))
    return value;
  return source === "PACKAGE" ? "PACKAGE" : "CUSTOM";
};

const EVENT_STATUS = {
  TENTATIVE: {
    label: "Tentative",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

const SLOT_PRESETS = [
  {
    value: "LUNCH",
    label: "Lunch · 12 PM – 4 PM",
    startTime: "12:00",
    endTime: "16:00",
  },
  {
    value: "DINNER",
    label: "Dinner · 7 PM – 11 PM",
    startTime: "19:00",
    endTime: "23:00",
  },
  {
    value: "CUSTOM",
    label: "Custom Time",
    startTime: "18:00",
    endTime: "22:00",
  },
];

const CREATE_STEPS = [
  { id: "basics", label: "When & Where", hint: "Date, hall, guests" },
  { id: "customer", label: "Customer", hint: "Guest contact" },
  { id: "menu", label: "Menu & Extras", hint: "Package or custom" },
  { id: "billing", label: "Review", hint: "Price & confirm" },
];

const EVENT_NAME_DEFAULTS = {
  BIRTHDAY: "Birthday Celebration",
  ANNIVERSARY: "Anniversary Celebration",
  KITTY_PARTY: "Kitty Party",
  RING_CEREMONY: "Ring Ceremony",
  CORPORATE_MEET: "Corporate Meet",
  WEDDING: "Wedding Reception",
  CONFERENCE: "Conference",
  MEETING: "Private Meeting",
  OTHER: "Private Event",
};

const emptyPackageForm = () => ({
  name: "",
  code: "",
  description: "",
  pricingType: "PER_PLATE",
  price: "",
  items: [],
  isActive: true,
});

const ADDON_TYPES = [
  { value: "DECORATION", label: "Decoration" },
  { value: "DJ_SOUND", label: "DJ / Sound System" },
  { value: "EXTRA_HOURS", label: "Extra Hours" },
  { value: "OTHER", label: "Other" },
];

const SEATING_OPTIONS = [
  "THEATER",
  "CLASSROOM",
  "ROUND_TABLE",
  "U_SHAPE",
  "BOARDROOM",
  "BUFFET",
  "OPEN",
  "OTHER",
];

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"];
const DISCOUNT_TYPES = ["PERCENTAGE", "FLAT"];
const TAX_TYPES = ["PERCENTAGE", "FLAT"];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const todayISO = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const dateLabel = (value) => {
  if (!value) return "-";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const timeLabel = (value) => {
  if (!value) return "-";
  const [h, m] = String(value).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return String(value);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const monthLabel = (date) =>
  date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

const daysInMonth = (date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const days = [];
  for (let i = 0; i < first.getDay(); i += 1) days.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(date.getFullYear(), date.getMonth(), day));
  }
  return days;
};

const sameDate = (a, b) =>
  Boolean(
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate(),
  );

const requestId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptyItem = () => ({
  itemId: "",
  name: "",
  quantity: 1,
  price: 0,
  notes: "",
});

const emptyAddon = () => ({
  type: "DECORATION",
  name: "",
  quantity: 1,
  unitPrice: 0,
  notes: "",
});

const emptyForm = () => ({
  eventName: "",
  eventType: "BIRTHDAY",
  customer: {
    name: "",
    phone: "",
    phoneVerified: false,
    alternatePhone: "",
    email: "",
    companyName: "",
    address: "",
  },
  schedule: {
    eventDate: todayISO(),
    slotType: "DINNER",
    startTime: "19:00",
    endTime: "23:00",
    setupStartTime: "17:00",
    notes: "",
  },
  venue: {
    sectionId: "",
    name: "",
    seatingArrangement: "ROUND_TABLE",
    notes: "",
  },
  guests: {
    expected: 1,
    guaranteed: 0,
    adults: 0,
    children: 0,
  },
  menu: {
    source: "PACKAGE",
    packageId: "",
    packageName: "",
    menuType: "PACKAGE",
    items: [],
    notes: "",
  },
  addons: [],
  pricing: {
    pricingType: "PER_PLATE",
    perPlate: 0,
    baseAmount: 0,
    discountType: "PERCENTAGE",
    discountValue: 0,
    taxType: "PERCENTAGE",
    taxValue: 0,
  },
  payment: {
    advanceAmount: 0,
    method: "CASH",
    referenceNumber: "",
    notes: "",
  },
  internalNotes: "",
  status: "TENTATIVE",
});

const eventId = (event) => event?._id || event?.id;
const eventDate = (event) => event?.schedule?.eventDate || event?.eventDate;
const eventTotal = (event) =>
  event?.pricing?.totalAmount ?? event?.pricing?.total ?? event?.total ?? 0;
const eventPaid = (event) => event?.payment?.paidAmount ?? event?.paid ?? 0;
const eventDue = (event) =>
  event?.payment?.dueAmount ??
  event?.due ??
  Math.max(0, Number(eventTotal(event)) - Number(eventPaid(event)));

function normalizeEvent(event) {
  return {
    eventName: event?.eventName || "",
    eventType: normalizeEventType(event?.eventType || "BIRTHDAY"),
    customer: {
      name: event?.customer?.name || event?.customerName || "",
      phone: event?.customer?.phone || event?.customerPhone || "",
      phoneVerified: Boolean(event?.customer?.phoneVerified),
      alternatePhone: event?.customer?.alternatePhone || "",
      email: event?.customer?.email || "",
      companyName: event?.customer?.companyName || "",
      address: event?.customer?.address || "",
    },
    schedule: {
      eventDate: String(eventDate(event) || todayISO()).slice(0, 10),
      slotType: event?.schedule?.slotType || "CUSTOM",
      startTime: event?.schedule?.startTime || event?.startTime || "18:00",
      endTime: event?.schedule?.endTime || event?.endTime || "22:00",
      setupStartTime: event?.schedule?.setupStartTime || "",
      notes: event?.schedule?.notes || "",
    },
    venue: {
      sectionId: event?.venue?.sectionId?._id || event?.venue?.sectionId || "",
      name:
        event?.venue?.name ||
        event?.venueName ||
        (typeof event?.venue === "string" ? event.venue : ""),
      seatingArrangement: event?.venue?.seatingArrangement || "ROUND_TABLE",
      notes: event?.venue?.notes || "",
    },
    guests: {
      expected: event?.guests?.expected ?? event?.guests ?? 1,
      guaranteed: event?.guests?.guaranteed ?? 0,
      adults: event?.guests?.adults ?? 0,
      children: event?.guests?.children ?? 0,
    },
    menu: {
      source:
        event?.menu?.source || (event?.menu?.packageId ? "PACKAGE" : "CUSTOM"),
      packageId: event?.menu?.packageId?._id || event?.menu?.packageId || "",
      packageName: event?.menu?.packageName || "",
      menuType: normalizeMenuType(
        event?.menu?.menuType,
        event?.menu?.source || (event?.menu?.packageId ? "PACKAGE" : "CUSTOM"),
      ),
      items: (event?.menu?.items || []).map((item) => ({
        itemId: item.itemId || "",
        name: item.name || "",
        quantity: item.quantity ?? 1,
        price: item.price ?? 0,
        notes: item.notes || "",
      })),
      notes: event?.menu?.notes || "",
    },
    addons: (event?.addons || []).map((addon) => ({
      type: addon.type || "OTHER",
      name: addon.name || "",
      quantity: addon.quantity ?? 1,
      unitPrice: addon.unitPrice ?? 0,
      notes: addon.notes || "",
    })),
    pricing: {
      pricingType: event?.pricing?.pricingType || "PER_PLATE",
      perPlate: event?.pricing?.perPlate ?? 0,
      baseAmount: event?.pricing?.baseAmount ?? 0,
      discountType: event?.pricing?.discountType || "PERCENTAGE",
      discountValue: event?.pricing?.discountValue ?? 0,
      taxType: event?.pricing?.taxType || "PERCENTAGE",
      taxValue: event?.pricing?.taxValue ?? 0,
    },
    payment: {
      advanceAmount:
        event?.payment?.paidAmount ?? event?.payment?.advanceAmount ?? 0,
      method: "CASH",
      referenceNumber: "",
      notes: "",
    },
    internalNotes: event?.internalNotes || "",
    status: event?.status || "TENTATIVE",
  };
}

function buildPayload(form, create, sections = [], stableRequestId = null) {
  const selectedSection = sections.find(
    (section) =>
      String(section?._id || section?.id) === String(form.venue.sectionId),
  );
  const phone = String(form.customer.phone || "").replace(/\D/g, "");
  const alternatePhone = String(form.customer.alternatePhone || "").replace(
    /\D/g,
    "",
  );

  return {
    ...(create ? { clientRequestId: stableRequestId || requestId() } : {}),
    eventName: form.eventName.trim(),
    eventType: normalizeEventType(form.eventType),
    customer: {
      name: form.customer.name.trim(),
      phone,
      phoneVerified: Boolean(form.customer.phoneVerified),
      alternatePhone,
      email: form.customer.email.trim().toLowerCase(),
      companyName: form.customer.companyName.trim(),
      address: form.customer.address.trim(),
    },
    schedule: {
      eventDate: form.schedule.eventDate,
      slotType: form.schedule.slotType,
      startTime: form.schedule.startTime,
      endTime: form.schedule.endTime,
      setupStartTime: form.schedule.setupStartTime,
      notes: form.schedule.notes.trim(),
    },
    venue: {
      sectionId: form.venue.sectionId,
      name:
        selectedSection?.name ||
        selectedSection?.sectionName ||
        form.venue.name ||
        "",
      seatingArrangement: form.venue.seatingArrangement,
      notes: form.venue.notes.trim(),
    },
    guests: {
      expected: Number(form.guests.expected || 0),
      guaranteed: Number(form.guests.guaranteed || 0),
      adults: Number(form.guests.adults || 0),
      children: Number(form.guests.children || 0),
    },
    menu: {
      source: form.menu.source,
      packageId: form.menu.source === "PACKAGE" ? form.menu.packageId : null,
      packageName: form.menu.packageName.trim(),
      menuType:
        form.menu.source === "PACKAGE"
          ? "PACKAGE"
          : form.menu.menuType === "PACKAGE"
            ? "CUSTOM"
            : form.menu.menuType,
      items:
        form.menu.source === "CUSTOM"
          ? form.menu.items
              .filter((item) => item.name.trim())
              .map((item) => ({
                itemId: item.itemId || null,
                name: item.name.trim(),
                quantity: Number(item.quantity || 1),
                price: Number(item.price || 0),
                notes: item.notes.trim(),
              }))
          : [],
      notes: form.menu.notes.trim(),
    },
    addons: form.addons.map((addon) => ({
      type: addon.type,
      name: addon.name.trim(),
      quantity: Number(addon.quantity || 1),
      unitPrice: Number(addon.unitPrice || 0),
      notes: addon.notes.trim(),
    })),
    pricing: {
      pricingType: form.pricing.pricingType,
      perPlate: Number(form.pricing.perPlate || 0),
      baseAmount: Number(form.pricing.baseAmount || 0),
      discountType: form.pricing.discountType,
      discountValue: Number(form.pricing.discountValue || 0),
      taxType: form.pricing.taxType,
      taxValue: Number(form.pricing.taxValue || 0),
    },
    ...(create
      ? {
          payment: {
            advanceAmount: Number(form.payment.advanceAmount || 0),
            method: form.payment.method,
            referenceNumber: form.payment.referenceNumber.trim(),
            notes: form.payment.notes.trim(),
          },
        }
      : {}),
    internalNotes: form.internalNotes.trim(),
    ...(create ? { status: form.status } : {}),
  };
}

function FormSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] p-4">
      <h3 className="mb-3 text-sm font-black text-[var(--text-primary)]">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, type = "text", required, min, step }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value ?? ""}
        min={min}
        step={step ?? (type === "number" ? "any" : undefined)}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]">
        {label}
        {required ? " *" : ""}
      </span>
      <select
        value={value ?? ""}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
      >
        <option value="">Select...</option>
        {options.map((option) => {
          const item =
            typeof option === "string"
              ? {
                  value: option,
                  label: option.replaceAll("_", " "),
                }
              : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]">
        {label}
      </span>
      <textarea
        value={value ?? ""}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
      />
    </label>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false, footer }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px]"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-2xl ${
          wide ? "max-w-5xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-black text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WizardSteps({ step }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CREATE_STEPS.map((item, index) => {
        const active = index === step;
        const done = index < step;
        return (
          <div
            key={item.id}
            className={`rounded-2xl border px-3 py-2.5 ${
              active
                ? "border-[var(--primary)] bg-[var(--primary-light)]"
                : done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[var(--border)] bg-white"
            }`}
          >
            <p
              className={`text-[10px] font-black uppercase tracking-wide ${
                active
                  ? "text-[var(--primary)]"
                  : done
                    ? "text-emerald-700"
                    : "text-[var(--text-muted)]"
              }`}
            >
              Step {index + 1}
            </p>
            <p className="mt-0.5 text-xs font-black text-[var(--text-primary)]">
              {item.label}
            </p>
            <p className="mt-0.5 hidden text-[10px] text-[var(--text-muted)] sm:block">
              {item.hint}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Summary({ label, value, strong = false }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p
        className={`mt-1 ${
          strong ? "text-base font-black" : "text-sm font-bold"
        } text-[var(--text-primary)]`}
      >
        {value}
      </p>
    </div>
  );
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <Icon size={17} />
        </span>
        <p className="text-right text-[11px] font-bold text-slate-400">
          {title}
        </p>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-bold text-slate-400">{description}</p>
    </div>
  );
}

function Info({ title, value, sub, icon: Icon }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
          <Icon size={17} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {title}
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
            {value || "-"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{sub || ""}</p>
        </div>
      </div>
    </div>
  );
}

export default function EventManagement() {
  const { user } = useAuth();
  const entitled = hasEventManagementAccess(user);

  const [workspace, setWorkspace] = useState("EVENTS");
  const [view, setView] = useState("LIST");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [events, setEvents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    totalGuests: 0,
    totalRevenue: 0,
    totalPaid: 0,
    totalDue: 0,
  });

  const [sections, setSections] = useState([]);
  const [packages, setPackages] = useState([]);
  const [managedPackages, setManagedPackages] = useState([]);
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [packageMenuSearch, setPackageMenuSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [packageSaving, setPackageSaving] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState(emptyForm());
  // Keep the same id when a failed create is retried; this makes retries idempotent.
  const createRequestIdRef = useRef(null);

  const [packageFormOpen, setPackageFormOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [packageForm, setPackageForm] = useState(emptyPackageForm());

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const monthStart = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    [currentMonth],
  );

  const monthEnd = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0),
    [currentMonth],
  );

  const calendarDays = useMemo(() => daysInMonth(currentMonth), [currentMonth]);

  const loadEvents = useCallback(
    async (silent = false) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);

        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        params.set("page", String(page));
        params.set("limit", "20");

        const response = await axios.get(
          `${API_BASE}/events?${params.toString()}`,
          apiConfig,
        );

        const data = response.data?.data || {};
        setEvents(data.events || []);
        setPagination(
          data.pagination || {
            page,
            limit: 20,
            total: 0,
            pages: 1,
          },
        );
      } catch (error) {
        toast.error(error?.response?.data?.message || "Unable to load events.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, statusFilter],
  );

  const loadStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/events/stats`, apiConfig);
      setStats(
        response.data?.data || {
          totalEvents: 0,
          upcomingEvents: 0,
          totalGuests: 0,
          totalRevenue: 0,
          totalPaid: 0,
          totalDue: 0,
        },
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to load event statistics.",
      );
    }
  }, []);

  const loadCalendarEvents = useCallback(async () => {
    try {
      const from = `${monthStart.getFullYear()}-${String(
        monthStart.getMonth() + 1,
      ).padStart(2, "0")}-01`;

      const to = `${monthEnd.getFullYear()}-${String(
        monthEnd.getMonth() + 1,
      ).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;

      const response = await axios.get(
        `${API_BASE}/events/calendar?from=${from}&to=${to}`,
        apiConfig,
      );

      setCalendarEvents(response.data?.data?.events || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load calendar.");
    }
  }, [monthStart, monthEnd]);

  const parsePackageList = (response) => {
    const data = response?.data?.data;
    const list = Array.isArray(data)
      ? data
      : data?.packages || response?.data?.packages || [];
    return Array.isArray(list) ? list : [];
  };

  const loadManagedPackages = useCallback(async () => {
    try {
      setPackagesLoading(true);
      const response = await axios.get(`${API_BASE}/event-packages`, apiConfig);
      const list = parsePackageList(response);
      setManagedPackages(list);
      setPackages(list.filter((item) => item?.isActive !== false));
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to load event packages.",
      );
      setManagedPackages([]);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  const loadMasters = useCallback(async () => {
    // Load each master independently so one failed endpoint does not blank
    // the other dropdowns. These paths match the supplied router contracts:
    // sections router exposes GET /admin; menu router exposes GET /admin/items.
    const [sectionResult, packageResult, menuResult] = await Promise.allSettled(
      [
        axios.get(`${API_BASE}/sections/admin`, apiConfig),
        axios.get(`${API_BASE}/event-packages?active=true`, apiConfig),
        axios.get(`${API_BASE}/menu/admin/items`, apiConfig),
      ],
    );

    if (sectionResult.status === "fulfilled") {
      const response = sectionResult.value;
      const data = response.data?.data;
      const list = Array.isArray(data)
        ? data
        : data?.sections || response.data?.sections || [];
      setSections(Array.isArray(list) ? list : []);
    } else {
      console.warn(
        "Unable to load event sections:",
        sectionResult.reason?.response?.data || sectionResult.reason?.message,
      );
      setSections([]);
    }

    if (packageResult.status === "fulfilled") {
      setPackages(parsePackageList(packageResult.value));
    } else {
      console.warn(
        "Unable to load event packages:",
        packageResult.reason?.response?.data || packageResult.reason?.message,
      );
      setPackages([]);
    }

    if (menuResult.status === "fulfilled") {
      const response = menuResult.value;
      const data = response.data?.data;
      setMenuCatalog(Array.isArray(data) ? data : data?.items || []);
    } else {
      console.warn(
        "Unable to load restaurant menu:",
        menuResult.reason?.response?.data || menuResult.reason?.message,
      );
      setMenuCatalog([]);
    }
  }, []);

  const addCatalogItemToEventMenu = useCallback((catalogItem) => {
    if (!catalogItem?._id || !catalogItem?.name) return;
    setForm((current) => {
      const existingIndex = current.menu.items.findIndex(
        (item) => String(item.itemId || "") === String(catalogItem._id),
      );
      if (existingIndex >= 0) {
        return {
          ...current,
          menu: {
            ...current.menu,
            items: current.menu.items.map((item, index) =>
              index === existingIndex
                ? { ...item, quantity: Number(item.quantity || 1) + 1 }
                : item,
            ),
          },
        };
      }
      return {
        ...current,
        menu: {
          ...current.menu,
          items: [
            ...current.menu.items,
            {
              itemId: catalogItem._id,
              name: catalogItem.name,
              quantity: 1,
              price: Number(catalogItem.price || 0),
              notes: "",
            },
          ],
        },
      };
    });
    toast.success(`${catalogItem.name} added to event menu.`);
  }, []);

  useEffect(() => {
    if (!entitled) return undefined;
    const timer = setTimeout(() => {
      setPage(1);
      loadEvents();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, statusFilter, entitled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!entitled) return undefined;
    const timer = setTimeout(() => {
      loadEvents();
    }, 0);

    return () => clearTimeout(timer);
  }, [page, entitled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!entitled) return undefined;
    const timer = setTimeout(() => {
      loadStats();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadStats, entitled]);

  useEffect(() => {
    if (!entitled) return undefined;
    const timer = setTimeout(() => {
      loadCalendarEvents();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadCalendarEvents, entitled]);

  useEffect(() => {
    if (!entitled) return undefined;
    const timer = setTimeout(() => {
      loadMasters();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadMasters, entitled]);

  useEffect(() => {
    if (!entitled || workspace !== "PACKAGES") return undefined;
    const timer = setTimeout(() => {
      loadManagedPackages();
    }, 0);
    return () => clearTimeout(timer);
  }, [workspace, loadManagedPackages, entitled]);

  const refreshAll = async () => {
    await Promise.all([
      loadEvents(true),
      loadStats(),
      loadCalendarEvents(),
      loadMasters(),
      workspace === "PACKAGES" ? loadManagedPackages() : Promise.resolve(),
    ]);
  };

  const openCreate = () => {
    createRequestIdRef.current = requestId();
    setEditMode(false);
    setWizardStep(0);
    const nextForm = emptyForm();
    // If no active package exists (or package loading failed), allow the user
    // to build a custom menu instead of trapping submission on an empty select.
    if (!packages.some((item) => item?.isActive !== false)) {
      nextForm.menu.source = "CUSTOM";
      nextForm.menu.menuType = "CUSTOM";
      nextForm.pricing.pricingType = "FLAT";
    }
    nextForm.eventName = EVENT_NAME_DEFAULTS.BIRTHDAY;
    setForm(nextForm);
    setFormOpen(true);
  };

  const openEdit = () => {
    if (!selectedEvent) return;
    setEditMode(true);
    setWizardStep(0);
    setForm(normalizeEvent(selectedEvent));
    setFormOpen(true);
  };

  const openCreatePackage = () => {
    setEditingPackageId(null);
    setPackageForm(emptyPackageForm());
    setPackageMenuSearch("");
    setPackageFormOpen(true);
  };

  const openEditPackage = (pkg) => {
    setEditingPackageId(pkg?._id || pkg?.id || null);
    setPackageForm({
      name: pkg?.name || "",
      code: pkg?.code || "",
      description: pkg?.description || "",
      pricingType: pkg?.pricingType || "PER_PLATE",
      price: pkg?.price ?? "",
      items: (pkg?.items || []).map((item) => ({
        menuItemId: item.menuItemId || item.itemId || "",
        name: item.name || "",
        quantity: item.quantity ?? 1,
        price: item.price ?? 0,
        notes: item.notes || "",
      })),
      isActive: pkg?.isActive !== false,
    });
    setPackageMenuSearch("");
    setPackageFormOpen(true);
  };

  const applySelectedPackage = (packageId) => {
    const pkg = packages.find(
      (item) => String(item._id || item.id) === String(packageId),
    );
    setField("menu.packageId", packageId);
    setField("menu.packageName", pkg?.name || "");
    setField("menu.source", "PACKAGE");
    setField("menu.menuType", "PACKAGE");
    const type = pkg?.pricingType || "PER_PLATE";
    setField("pricing.pricingType", type);
    setField("pricing.perPlate", type === "PER_PLATE" ? Number(pkg?.price ?? 0) : 0);
    setField("pricing.baseAmount", type === "FLAT" ? Number(pkg?.price ?? 0) : 0);
  };

  const openEvent = async (id) => {
    try {
      setDetailLoading(true);
      setDetailOpen(true);

      const response = await axios.get(`${API_BASE}/events/${id}`, apiConfig);

      setSelectedEvent(response.data?.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load event.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const setField = (path, value) => {
    setForm((current) => {
      const next = structuredClone(current);
      const parts = path.split(".");
      let target = next;

      for (let i = 0; i < parts.length - 1; i += 1) {
        target = target[parts[i]];
      }

      target[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const applySlot = (slotType) => {
    const slot = SLOT_PRESETS.find((item) => item.value === slotType);

    setField("schedule.slotType", slotType);

    if (slot && slotType !== "CUSTOM") {
      setField("schedule.startTime", slot.startTime);
      setField("schedule.endTime", slot.endTime);
      setField("schedule.setupStartTime", slot.startTime);
    }
  };

  const validateBasicsStep = () => {
    if (!form.eventName.trim()) return "Event name is required.";
    if (
      !EVENT_TYPES.some(
        (item) => item.value === normalizeEventType(form.eventType),
      )
    )
      return "Select a valid event type.";
    if (!form.schedule.eventDate) return "Event date is required.";
    if (!form.schedule.startTime || !form.schedule.endTime) {
      return "Start and end time are required.";
    }
    if (form.schedule.endTime <= form.schedule.startTime) {
      return "End time must be after start time.";
    }
    if (!form.venue.sectionId) {
      return "Select a restaurant section / hall.";
    }
    if (
      !Number.isInteger(Number(form.guests.expected)) ||
      Number(form.guests.expected) < 1 ||
      Number(form.guests.expected) > 100000
    ) {
      return "Expected guests must be a whole number between 1 and 100000.";
    }
    if (
      !Number.isInteger(Number(form.guests.guaranteed)) ||
      Number(form.guests.guaranteed) < 0
    ) {
      return "Guaranteed guests must be a non-negative whole number.";
    }
    if (Number(form.guests.guaranteed) > Number(form.guests.expected)) {
      return "Guaranteed guests cannot exceed expected guests.";
    }
    return null;
  };

  const validateCustomerStep = () => {
    const phone = String(form.customer.phone || "").replace(/\D/g, "");
    const alternatePhone = String(form.customer.alternatePhone || "").replace(
      /\D/g,
      "",
    );
    if (!form.customer.name.trim()) return "Customer name is required.";
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return "Enter a valid 10-digit Indian mobile number.";
    }
    if (alternatePhone && !/^[6-9]\d{9}$/.test(alternatePhone)) {
      return "Enter a valid alternate mobile number.";
    }
    return null;
  };

  const validateMenuStep = () => {
    if (form.menu.source === "PACKAGE" && !form.menu.packageId) {
      return "Select an event package.";
    }
    if (
      form.menu.source === "CUSTOM" &&
      !form.menu.items.some((item) => item.name.trim())
    ) {
      return "Add at least one custom menu item.";
    }
    if (form.menu.source === "CUSTOM") {
      for (const item of form.menu.items.filter((entry) => entry.name.trim())) {
        const quantity = Number(item.quantity);
        const price = Number(item.price);
        if (!Number.isInteger(quantity) || quantity < 1) {
          return `Quantity for ${item.name.trim()} must be a whole number (1 or more).`;
        }
        if (!Number.isFinite(price) || price < 0) {
          return `Enter a valid price for ${item.name.trim()}.`;
        }
      }
    }
    for (const addon of form.addons) {
      if (!addon.name.trim()) return "Every add-on needs a name.";
      if (
        !Number.isFinite(Number(addon.quantity)) ||
        Number(addon.quantity) <= 0
      ) {
        return "Add-on quantity must be greater than 0.";
      }
      if (
        addon.type !== "EXTRA_HOURS" &&
        !Number.isInteger(Number(addon.quantity))
      ) {
        return "Add-on quantity must be a whole number. Extra hours can be entered in 0.5-hour increments.";
      }
      if (
        addon.type === "EXTRA_HOURS" &&
        (Number(addon.quantity) * 2) % 1 !== 0
      ) {
        return "Extra hours must be entered in 0.5-hour increments.";
      }
      if (
        !Number.isFinite(Number(addon.unitPrice)) ||
        Number(addon.unitPrice) < 0
      ) {
        return "Add-on price cannot be negative.";
      }
    }
    return null;
  };

  const validateBillingStep = () => {
    if (Number(form.pricing.discountValue) < 0) {
      return "Discount cannot be negative.";
    }
    if (
      form.pricing.discountType === "PERCENTAGE" &&
      Number(form.pricing.discountValue) > 100
    ) {
      return "Discount percentage cannot exceed 100%.";
    }
    if (Number(form.pricing.taxValue) < 0) {
      return "Tax cannot be negative.";
    }
    if (
      form.pricing.taxType === "PERCENTAGE" &&
      Number(form.pricing.taxValue) > 100
    ) {
      return "Tax percentage cannot exceed 100%.";
    }
    if (
      !Number.isFinite(Number(form.payment.advanceAmount)) ||
      Number(form.payment.advanceAmount) < 0
    ) {
      return "Advance cannot be negative.";
    }
    if (
      !editMode &&
      Number(form.payment.advanceAmount) > Number(pricingPreview.total)
    ) {
      return "Advance cannot exceed the estimated event total.";
    }
    if (
      form.pricing.discountType === "FLAT" &&
      Number(form.pricing.discountValue) > Number(pricingPreview.subtotal)
    ) {
      return "Flat discount cannot exceed the subtotal.";
    }
    return null;
  };

  const validateStep = (step) => {
    if (step === 0) return validateBasicsStep();
    if (step === 1) return validateCustomerStep();
    if (step === 2) return validateMenuStep();
    if (step === 3) return validateBillingStep();
    return null;
  };

  const validateForm = () =>
    validateBasicsStep() ||
    validateCustomerStep() ||
    validateMenuStep() ||
    validateBillingStep();

  const goNextStep = () => {
    const error = validateStep(wizardStep);
    if (error) {
      toast.error(error);
      return;
    }
    setWizardStep((current) => Math.min(current + 1, CREATE_STEPS.length - 1));
  };

  const goPrevStep = () => {
    setWizardStep((current) => Math.max(current - 1, 0));
  };

  const submitPackage = async () => {
    if (packageSaving) return;
    const name = String(packageForm.name || "").trim();
    const price = Number(packageForm.price);
    if (!name) {
      toast.error("Package name is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid package price.");
      return;
    }
    const items = (packageForm.items || [])
      .filter((item) => String(item.name || "").trim())
      .map((item) => ({
        menuItemId: item.menuItemId || null,
        name: String(item.name).trim(),
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        notes: String(item.notes || "").trim(),
      }));
    for (const item of items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        toast.error(`Invalid quantity for ${item.name}.`);
        return;
      }
      if (!Number.isFinite(item.price) || item.price < 0) {
        toast.error(`Invalid price for ${item.name}.`);
        return;
      }
    }

    try {
      setPackageSaving(true);
      const payload = {
        name,
        code: String(packageForm.code || "").trim(),
        description: String(packageForm.description || "").trim(),
        pricingType: packageForm.pricingType || "PER_PLATE",
        price,
        items,
        isActive: packageForm.isActive !== false,
      };

      if (editingPackageId) {
        await axios.patch(
          `${API_BASE}/event-packages/${editingPackageId}`,
          payload,
          apiConfig,
        );
        toast.success("Package updated.");
      } else {
        await axios.post(`${API_BASE}/event-packages`, payload, apiConfig);
        toast.success("Package created.");
      }

      setPackageFormOpen(false);
      setEditingPackageId(null);
      setPackageForm(emptyPackageForm());
      await Promise.all([loadMasters(), loadManagedPackages()]);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to save event package.",
      );
    } finally {
      setPackageSaving(false);
    }
  };

  const togglePackageActive = async (pkg) => {
    const id = pkg?._id || pkg?.id;
    if (!id) return;
    try {
      await axios.patch(
        `${API_BASE}/event-packages/${id}`,
        { isActive: pkg?.isActive === false },
        apiConfig,
      );
      toast.success(
        pkg?.isActive === false ? "Package activated." : "Package deactivated.",
      );
      await Promise.all([loadMasters(), loadManagedPackages()]);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to update package status.",
      );
    }
  };

  const checkAvailability = async () => {
    if (
      !form.venue.sectionId ||
      !form.schedule.eventDate ||
      !form.schedule.startTime ||
      !form.schedule.endTime
    ) {
      toast.error("Select hall, date and time first.");
      return;
    }

    try {
      setAvailabilityLoading(true);

      const params = new URLSearchParams({
        sectionId: form.venue.sectionId,
        eventDate: form.schedule.eventDate,
        startTime: form.schedule.startTime,
        endTime: form.schedule.endTime,
      });

      if (editMode && selectedEvent?._id) {
        params.set("excludeId", selectedEvent._id);
      }

      const response = await axios.get(
        `${API_BASE}/events/availability?${params.toString()}`,
        apiConfig,
      );

      const availability = response.data?.data;
      if (availability?.available) {
        toast.success("Selected hall is available.");
      } else {
        const conflict = availability?.conflicts?.[0];
        toast.error(
          conflict
            ? `${conflict.eventNumber || "Existing event"} is booked from ${conflict.schedule?.startTime || conflict.startTime || "—"} to ${conflict.schedule?.endTime || conflict.endTime || "—"}.`
            : "Selected hall is not available.",
        );
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to check availability.",
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const submitEvent = async (e) => {
    e?.preventDefault?.();

    if (saving) return;

    const validationError = validateForm();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload(
        form,
        !editMode,
        sections,
        createRequestIdRef.current,
      );

      if (editMode) {
        await axios.patch(
          `${API_BASE}/events/${selectedEvent._id}`,
          payload,
          apiConfig,
        );
        toast.success("Event updated successfully.");
      } else {
        await axios.post(`${API_BASE}/events`, payload, apiConfig);
        toast.success("Event created successfully.");
      }

      setFormOpen(false);
      if (!editMode) createRequestIdRef.current = null;

      await Promise.all([loadEvents(true), loadStats(), loadCalendarEvents()]);

      if (editMode && selectedEvent?._id) {
        await openEvent(selectedEvent._id);
      }
    } catch (error) {
      const code = error?.response?.data?.code;

      if (
        code === "EVENT_SECTION_ALREADY_BOOKED" ||
        code === "EVENT_SLOT_CONFLICT" ||
        code === "HALL_TIME_CONFLICT"
      ) {
        toast.error("This hall is already booked for the selected time.");
      } else {
        const message = error?.response?.data?.message;
        toast.error(
          message ||
            (error?.response
              ? `Unable to save event (HTTP ${error.response.status}).`
              : "Unable to connect to the server. Check your connection and try again."),
        );
        console.error("Event save failed:", {
          status: error?.response?.status,
          code: error?.response?.data?.code,
          message: error?.response?.data?.message,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status) => {
    if (!selectedEvent?._id) return;

    let reason = "";

    if (status === "CANCELLED") {
      reason = window.prompt("Enter cancellation reason")?.trim() || "";

      if (!reason) return;
    }

    try {
      await axios.patch(
        `${API_BASE}/events/${selectedEvent._id}/status`,
        {
          status,
          reason,
          cancellationReason: reason,
        },
        apiConfig,
      );

      toast.success("Event status updated.");

      await Promise.all([loadEvents(true), loadStats(), loadCalendarEvents()]);

      await openEvent(selectedEvent._id);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to update event status.",
      );
    }
  };

  const addPayment = async () => {
    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    if (amount > Number(eventDue(selectedEvent))) {
      toast.error("Payment cannot exceed remaining due.");
      return;
    }

    try {
      setPaymentSaving(true);

      const response = await axios.patch(
        `${API_BASE}/events/${selectedEvent._id}/payment`,
        {
          amount,
          method: paymentMethod,
          referenceNumber: paymentReference.trim(),
          notes: paymentNotes.trim(),
        },
        apiConfig,
      );

      setSelectedEvent(response.data?.data || selectedEvent);
      setPaymentOpen(false);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");

      toast.success("Payment recorded successfully.");

      await Promise.all([loadEvents(true), loadStats()]);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to record payment.",
      );
    } finally {
      setPaymentSaving(false);
    }
  };

  const pricingPreview = (() => {
    const selectedPackage = packages.find(
      (pkg) => String(pkg?._id || pkg?.id) === String(form.menu.packageId),
    );

    const guests = Number(form.guests.expected || 0);

    const foodAmount =
      form.menu.source === "CUSTOM"
        ? form.menu.items.reduce(
            (sum, item) =>
              sum + Number(item.quantity || 0) * Number(item.price || 0),
            0,
          )
        : form.menu.source === "PACKAGE" && selectedPackage
          ? Number(selectedPackage.price ?? 0) *
            (selectedPackage.pricingType === "FLAT" ? 1 : guests)
          : form.pricing.pricingType === "PER_PLATE"
            ? Number(form.pricing.perPlate || 0) * guests
            : Number(form.pricing.baseAmount || 0);

    const addonAmount = form.addons.reduce(
      (sum, addon) =>
        sum + Number(addon.quantity || 0) * Number(addon.unitPrice || 0),
      0,
    );

    const subtotal = foodAmount + addonAmount;

    const discount =
      form.pricing.discountType === "PERCENTAGE"
        ? (subtotal * Number(form.pricing.discountValue || 0)) / 100
        : Number(form.pricing.discountValue || 0);

    const safeDiscount = Math.min(Math.max(0, discount), subtotal);

    const afterDiscount = subtotal - safeDiscount;

    const tax =
      form.pricing.taxType === "PERCENTAGE"
        ? (afterDiscount * Number(form.pricing.taxValue || 0)) / 100
        : Number(form.pricing.taxValue || 0);

    return {
      foodAmount,
      addonAmount,
      subtotal,
      discount: safeDiscount,
      tax,
      total: Math.max(0, afterDiscount + tax),
    };
  })();

  const getEventsForDay = (date) => {
    if (!date) return [];

    return calendarEvents.filter((event) => {
      const value = eventDate(event);

      if (!value) return false;

      return sameDate(new Date(`${String(value).slice(0, 10)}T00:00:00`), date);
    });
  };

  const changeMonth = (delta) => {
    setCurrentMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  const selectedSection = sections.find(
    (section) =>
      String(section?._id || section?.id) === String(form.venue.sectionId),
  );

  const activePackages = packages.filter((item) => item?.isActive !== false);
  const showBasics = wizardStep === 0;
  const showCustomer = wizardStep === 1;
  const showMenu = wizardStep === 2;
  const showBilling = wizardStep === 3;

  if (!entitled) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <CalendarDays className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-amber-950">
            Event Management unavailable
          </h2>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            Event Management requires an active subscription with
            EVENT_MANAGEMENT. Upgrade your plan to access this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 min-h-full bg-[var(--background)] p-4 font-sans text-slate-900 md:-m-6 md:p-5 lg:-m-8 lg:p-5">
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--secondary)] p-5 text-white shadow-sm">
        <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full border-[22px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-28 h-36 w-36 rounded-full border-[18px] border-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <CalendarDays size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Event Management
              </h1>
              <p className="mt-1 max-w-xl text-sm text-white/85">
                Create packages once, then book events in a few fast steps —
                schedule, guest, menu, and payment.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshAll}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/15 px-3 py-2.5 text-xs font-black text-white transition hover:bg-white/25 disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
            {workspace === "PACKAGES" ? (
              <button
                type="button"
                onClick={openCreatePackage}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[var(--primary)] shadow-sm transition hover:bg-rose-50"
              >
                <Plus size={16} /> New Package
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[var(--primary)] shadow-sm transition hover:bg-rose-50"
              >
                <Plus size={16} /> Quick Book Event
              </button>
            )}
          </div>
        </div>
        <div className="relative mt-4 inline-flex rounded-2xl border border-white/20 bg-white/10 p-1">
          {[
            { id: "EVENTS", label: "Events", icon: CalendarDays },
            { id: "PACKAGES", label: "Packages", icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = workspace === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkspace(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                  active
                    ? "bg-white text-[var(--primary)] shadow-sm"
                    : "text-white/85 hover:bg-white/10"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {workspace === "EVENTS" && (
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Events"
          value={stats.totalEvents || 0}
          description="All recorded events"
          icon={CalendarDays}
        />
        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEvents || 0}
          description="Confirmed & tentative"
          icon={Clock3}
        />
        <StatCard
          title="Total Guests"
          value={Number(stats.totalGuests || 0).toLocaleString("en-IN")}
          description="Across all events"
          icon={Users}
        />
        <StatCard
          title="Event Revenue"
          value={money(stats.totalRevenue)}
          description={`Due ${money(stats.totalDue)}`}
          icon={WalletCards}
        />
      </div>
      )}

      {workspace === "PACKAGES" && (
        <div className="mb-6 space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Event Packages
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Save reusable banquet menus so booking an event takes seconds.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreatePackage}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-black text-white"
              >
                <Plus size={15} /> Create Package
              </button>
            </div>
          </div>

          {packagesLoading ? (
            <div className="flex justify-center rounded-2xl border border-slate-100 bg-white py-16">
              <Loader2 className="animate-spin text-[var(--primary)]" size={28} />
            </div>
          ) : managedPackages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <Package className="mx-auto mb-3 text-slate-300" size={32} />
              <p className="font-black text-slate-800">No packages yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Create your first package (e.g. Veg Buffet ₹799/plate) then book
                events from it.
              </p>
              <button
                type="button"
                onClick={openCreatePackage}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-black text-white"
              >
                <Plus size={15} /> Create first package
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {managedPackages.map((pkg) => {
                const id = pkg._id || pkg.id;
                const active = pkg.isActive !== false;
                return (
                  <div
                    key={id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm ${
                      active ? "border-slate-100" : "border-slate-200 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {pkg.name}
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {pkg.code || "PKG"} ·{" "}
                          {(pkg.pricingType || "PER_PLATE") === "PER_PLATE"
                            ? "Per plate"
                            : "Flat"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                          active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-3 text-xl font-black text-slate-900">
                      {money(pkg.price)}
                      {(pkg.pricingType || "PER_PLATE") === "PER_PLATE" ? (
                        <span className="text-xs font-bold text-slate-400">
                          {" "}
                          / plate
                        </span>
                      ) : null}
                    </p>
                    {pkg.description ? (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                        {pkg.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[11px] font-semibold text-slate-400">
                      {(pkg.items || []).length} menu item
                      {(pkg.items || []).length === 1 ? "" : "s"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPackage(pkg)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePackageActive(pkg)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                      >
                        {active ? "Deactivate" : "Activate"}
                      </button>
                      {active ? (
                        <button
                          type="button"
                          onClick={() => {
                            setWorkspace("EVENTS");
                            openCreate();
                            // Pre-select package after create form state settles.
                            setTimeout(() => applySelectedPackage(id), 0);
                          }}
                          className="rounded-xl bg-[var(--primary-light)] px-3 py-2 text-xs font-bold text-[var(--primary-dark)]"
                        >
                          Book with this
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {workspace === "EVENTS" && (
      <>
      <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <div className="relative flex-1 md:max-w-md">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search event, customer or event type..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 outline-none"
            >
              <option value="ALL">All Status</option>
              {Object.entries(EVENT_STATUS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center rounded-xl border border-slate-100 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setView("LIST")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                view === "LIST"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-400"
              }`}
            >
              List
            </button>

            <button
              type="button"
              onClick={() => setView("CALENDAR")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                view === "CALENDAR"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-400"
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {view === "LIST" && (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[
                      "Event",
                      "Customer",
                      "Date & Time",
                      "Hall / Area",
                      "Guests",
                      "Amount",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <Loader2
                          className="mx-auto animate-spin text-[var(--primary)]"
                          size={26}
                        />
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <CalendarDays
                          size={28}
                          className="mx-auto mb-3 text-[var(--text-muted)]"
                        />
                        <p className="font-bold">No events found</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          Try another search or create a new event.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => {
                      const status =
                        EVENT_STATUS[event.status] || EVENT_STATUS.TENTATIVE;

                      const total = eventTotal(event);
                      const paid = eventPaid(event);

                      return (
                        <tr
                          key={eventId(event)}
                          onClick={() => openEvent(eventId(event))}
                          className="cursor-pointer border-b border-slate-50 hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold">
                              {event.eventName}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              {eventTypeLabel(event.eventType)} ·{" "}
                              {event.eventNumber}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold">
                              {event.customer?.name || event.customerName}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              +91{" "}
                              {displayPhone(
                                event.customer?.phone || event.customerPhone,
                                "",
                              ) || "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold">
                              {dateLabel(eventDate(event))}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              {timeLabel(
                                event.schedule?.startTime || event.startTime,
                              )}{" "}
                              –{" "}
                              {timeLabel(
                                event.schedule?.endTime || event.endTime,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-sm">
                              <MapPin size={14} />
                              {event.venue?.name || event.venue || "-"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-sm font-semibold">
                              <Users size={14} />
                              {event.guests?.expected ?? event.guests ?? 0}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold">{money(total)}</p>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              Due{" "}
                              {money(Math.max(0, Number(total) - Number(paid)))}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm">
            <span className="text-slate-400">
              {pagination.total
                ? `Showing page ${pagination.page} of ${pagination.pages}`
                : "No records"}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border px-3 py-1.5 font-bold disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= Number(pagination.pages || 1)}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border px-3 py-1.5 font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {view === "CALENDAR" && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black">
                {monthLabel(currentMonth)}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Booked events by date and hall
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b bg-[var(--surface-muted)]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="border-r px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const dayEvents = getEventsForDay(date);
              const today = sameDate(date, new Date());

              return (
                <div
                  key={date ? date.toISOString() : `empty-${index}`}
                  className="min-h-[125px] border-b border-r p-2"
                >
                  {date && (
                    <>
                      <div className="mb-2 flex justify-end">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            today
                              ? "bg-[var(--primary)] text-white"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {dayEvents.map((event) => (
                          <button
                            type="button"
                            key={eventId(event)}
                            onClick={() => openEvent(eventId(event))}
                            className="w-full rounded-lg border border-[var(--primary)] bg-[var(--primary-light)] p-2 text-left transition hover:shadow-sm"
                          >
                            <p className="truncate text-[11px] font-black text-[var(--primary-dark)]">
                              {event.eventName}
                            </p>

                            <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                              {timeLabel(
                                event.schedule?.startTime || event.startTime,
                              )}{" "}
                              –{" "}
                              {timeLabel(
                                event.schedule?.endTime || event.endTime,
                              )}
                            </p>

                            <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
                              {event.venue?.name || event.venue || "-"} ·{" "}
                              {event.guests?.expected ?? event.guests ?? 0}{" "}
                              guests
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
      )}

      {formOpen && (
        <Modal
          title={editMode ? "Edit Event" : "Quick Book Event"}
          subtitle={
            editMode
              ? "Update booking details"
              : `${CREATE_STEPS[wizardStep].label} · Step ${wizardStep + 1} of ${CREATE_STEPS.length}`
          }
          onClose={() => setFormOpen(false)}
          wide
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
              <div className="flex flex-wrap gap-2">
                {wizardStep > 0 ? (
                  <button
                    type="button"
                    onClick={goPrevStep}
                    className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold"
                  >
                    Back
                  </button>
                ) : null}
                {wizardStep < CREATE_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNextStep}
                    className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    disabled={saving}
                    type="button"
                    onClick={() => submitEvent()}
                    aria-busy={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving
                      ? editMode
                        ? "Saving Changes…"
                        : "Creating Event…"
                      : editMode
                        ? "Save Changes"
                        : "Confirm Booking"}
                  </button>
                )}
              </div>
            </div>
          }
        >
          <form noValidate onSubmit={submitEvent} className="space-y-5">
            <WizardSteps step={wizardStep} />

            {showCustomer && (
            <FormSection title="Customer Details">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="Customer Name"
                  value={form.customer.name}
                  onChange={(value) => setField("customer.name", value)}
                  required
                />

                <Field
                  label="Mobile Number"
                  value={form.customer.phone}
                  onChange={(value) =>
                    setField(
                      "customer.phone",
                      value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  required
                />

                <Field
                  label="Alternate Number"
                  value={form.customer.alternatePhone}
                  onChange={(value) =>
                    setField(
                      "customer.alternatePhone",
                      value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                />

                <Field
                  label="Email"
                  type="email"
                  value={form.customer.email}
                  onChange={(value) => setField("customer.email", value)}
                />

                <Field
                  label="Company Name"
                  value={form.customer.companyName}
                  onChange={(value) => setField("customer.companyName", value)}
                />

                <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={form.customer.phoneVerified}
                    onChange={(e) =>
                      setField("customer.phoneVerified", e.target.checked)
                    }
                  />
                  Phone verified
                </label>
              </div>

              <TextArea
                label="Customer Address"
                value={form.customer.address}
                onChange={(value) => setField("customer.address", value)}
              />
            </FormSection>
            )}

            {showBasics && (
            <>
            <FormSection title="When & Where">
              <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--text-secondary)]">
                  Event type *
                </p>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((type) => {
                    const active = form.eventType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          const previousDefault =
                            EVENT_NAME_DEFAULTS[form.eventType];
                          setField("eventType", type.value);
                          if (
                            !form.eventName.trim() ||
                            form.eventName === previousDefault
                          ) {
                            setField(
                              "eventName",
                              EVENT_NAME_DEFAULTS[type.value] || type.label,
                            );
                          }
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                          active
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                            : "border-[var(--border)] bg-white text-slate-600 hover:border-[var(--primary)]/40"
                        }`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Event Name"
                  value={form.eventName}
                  onChange={(value) => setField("eventName", value)}
                  required
                />

                <Field
                  label="Event Date"
                  type="date"
                  value={form.schedule.eventDate}
                  onChange={(value) => setField("schedule.eventDate", value)}
                  required
                />

                <div className="md:col-span-2">
                  <p className="mb-1.5 text-xs font-bold text-[var(--text-secondary)]">
                    Time slot
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SLOT_PRESETS.map((slot) => {
                      const active = form.schedule.slotType === slot.value;
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => applySlot(slot.value)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                            active
                              ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary-dark)]"
                              : "border-[var(--border)] bg-white text-slate-600"
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field
                  label="Start Time"
                  type="time"
                  value={form.schedule.startTime}
                  onChange={(value) => setField("schedule.startTime", value)}
                  required
                />

                <Field
                  label="End Time"
                  type="time"
                  value={form.schedule.endTime}
                  onChange={(value) => setField("schedule.endTime", value)}
                  required
                />

                <Field
                  label="Setup Start Time"
                  type="time"
                  value={form.schedule.setupStartTime}
                  onChange={(value) =>
                    setField("schedule.setupStartTime", value)
                  }
                />
              </div>
            </FormSection>

            <FormSection title="Hall / Area & Availability">
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField
                  label="Restaurant Section / Hall"
                  value={form.venue.sectionId}
                  onChange={(value) => {
                    const section = sections.find(
                      (item) => String(item._id || item.id) === String(value),
                    );
                    setField("venue.sectionId", value);
                    setField(
                      "venue.name",
                      section?.name ||
                        section?.sectionName ||
                        form.venue.name ||
                        "",
                    );
                  }}
                  options={sections.map((section) => ({
                    value: section._id || section.id,
                    label:
                      section.name || section.sectionName || "Unnamed Section",
                  }))}
                  required
                />

                <SelectField
                  label="Seating Arrangement"
                  value={form.venue.seatingArrangement}
                  onChange={(value) =>
                    setField("venue.seatingArrangement", value)
                  }
                  options={SEATING_OPTIONS}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={checkAvailability}
                  disabled={availabilityLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 disabled:opacity-50"
                >
                  {availabilityLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Check Availability
                </button>

                {selectedSection && (
                  <span className="text-xs text-[var(--text-muted)]">
                    Selected: <b>{selectedSection.name}</b>
                  </span>
                )}
              </div>

              <TextArea
                label="Venue Notes"
                value={form.venue.notes}
                onChange={(value) => setField("venue.notes", value)}
              />
            </FormSection>

            <FormSection title="Guest Count">
              <div className="grid gap-3 md:grid-cols-4">
                <Field
                  label="Expected Guests"
                  type="number"
                  min="1"
                  step="1"
                  value={form.guests.expected}
                  onChange={(value) => setField("guests.expected", value)}
                  required
                />

                <Field
                  label="Guaranteed Guests"
                  type="number"
                  min="0"
                  step="1"
                  value={form.guests.guaranteed}
                  onChange={(value) => setField("guests.guaranteed", value)}
                />

                <Field
                  label="Adults"
                  type="number"
                  min="0"
                  step="1"
                  value={form.guests.adults}
                  onChange={(value) => setField("guests.adults", value)}
                />

                <Field
                  label="Children"
                  type="number"
                  min="0"
                  step="1"
                  value={form.guests.children}
                  onChange={(value) => setField("guests.children", value)}
                />
              </div>
            </FormSection>
            </>
            )}

            {showMenu && (
            <>
            <FormSection title="Food Package / Custom Menu">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "PACKAGE", label: "Saved Package" },
                  { value: "CUSTOM", label: "Custom Menu" },
                ].map((option) => {
                  const active = form.menu.source === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setField("menu.source", option.value);
                        setField(
                          "menu.menuType",
                          option.value === "PACKAGE" ? "PACKAGE" : "CUSTOM",
                        );
                        if (option.value === "CUSTOM") {
                          setField("pricing.pricingType", "FLAT");
                        }
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] bg-white text-slate-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {form.menu.source === "PACKAGE" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {activePackages.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 sm:col-span-2">
                      No active packages yet.{" "}
                      <button
                        type="button"
                        className="font-bold text-[var(--primary)]"
                        onClick={() => {
                          setFormOpen(false);
                          setWorkspace("PACKAGES");
                          openCreatePackage();
                        }}
                      >
                        Create a package
                      </button>{" "}
                      or switch to Custom Menu.
                    </div>
                  ) : (
                    activePackages.map((pkg) => {
                      const id = pkg._id || pkg.id;
                      const selected =
                        String(form.menu.packageId) === String(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => applySelectedPackage(id)}
                          className={`rounded-2xl border p-3 text-left transition ${
                            selected
                              ? "border-[var(--primary)] bg-[var(--primary-light)] shadow-sm"
                              : "border-[var(--border)] bg-white hover:border-[var(--primary)]/35"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-black text-slate-900">
                              {pkg.name}
                            </p>
                            {selected ? (
                              <CheckCircle2
                                size={16}
                                className="shrink-0 text-[var(--primary)]"
                              />
                            ) : null}
                          </div>
                          <p className="mt-1 text-base font-black text-slate-900">
                            {money(pkg.price)}
                            {(pkg.pricingType || "PER_PLATE") === "PER_PLATE"
                              ? " / plate"
                              : ""}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {(pkg.items || []).length} items ·{" "}
                            {(pkg.pricingType || "PER_PLATE") === "PER_PLATE"
                              ? "Per plate"
                              : "Flat price"}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {form.menu.source === "CUSTOM" && (
                <SelectField
                  label="Menu Style"
                  value={form.menu.menuType}
                  onChange={(value) => setField("menu.menuType", value)}
                  options={["CUSTOM", "BUFFET", "PLATED", "OTHER"]}
                />
              )}

              {form.menu.source === "CUSTOM" && (
                <div className="mt-3 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        Restaurant Menu Catalog
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Category-wise items from your saved restaurant menu. Tap
                        an item to add it below.
                      </p>
                    </div>
                    <input
                      type="search"
                      value={menuSearch}
                      onChange={(event) => setMenuSearch(event.target.value)}
                      placeholder="Search menu items…"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] sm:max-w-xs"
                    />
                  </div>
                  {menuCatalog.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-3 text-sm text-[var(--text-muted)]">
                      No restaurant menu items loaded. Check that GET
                      /menu/admin/items is mounted and the restaurant has menu
                      items. You can still add items manually below.
                    </p>
                  ) : (
                    <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                      {Object.entries(
                        menuCatalog
                          .filter((item) => item?.isAvailable !== false)
                          .filter((item) =>
                            `${item.name || ""} ${item.category || ""}`
                              .toLowerCase()
                              .includes(menuSearch.trim().toLowerCase()),
                          )
                          .reduce((groups, item) => {
                            const category = item.category || "Uncategorized";
                            if (!groups[category]) groups[category] = [];
                            groups[category].push(item);
                            return groups;
                          }, {}),
                      )
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([category, items]) => (
                          <div key={category}>
                            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">
                              {category}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {items.map((item) => (
                                <button
                                  key={item._id}
                                  type="button"
                                  onClick={() =>
                                    addCatalogItemToEventMenu(item)
                                  }
                                  className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left transition hover:border-[var(--primary)] hover:bg-[var(--primary-light)]"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                                      {item.name}
                                    </span>
                                    <span className="block text-xs text-[var(--text-muted)]">
                                      {item.isVeg === false ? "Non-veg" : "Veg"}
                                    </span>
                                  </span>
                                  <span className="shrink-0 text-sm font-bold text-[var(--text-primary)]">
                                    {money(item.price)}
                                  </span>
                                  <Plus
                                    size={14}
                                    className="shrink-0 text-[var(--primary)]"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {form.menu.source === "CUSTOM" && (
                <div className="space-y-2">
                  {form.menu.items.map((item, index) => (
                    <div
                      key={`${index}-${item.name}`}
                      className="grid gap-2 rounded-xl border border-[var(--border)] p-3 md:grid-cols-5"
                    >
                      <Field
                        label="Item"
                        value={item.name}
                        onChange={(value) =>
                          setField(`menu.items.${index}.name`, value)
                        }
                      />

                      <Field
                        label="Quantity"
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(value) =>
                          setField(`menu.items.${index}.quantity`, value)
                        }
                      />

                      <Field
                        label="Price"
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(value) =>
                          setField(`menu.items.${index}.price`, value)
                        }
                      />

                      <Field
                        label="Notes"
                        value={item.notes}
                        onChange={(value) =>
                          setField(`menu.items.${index}.notes`, value)
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            menu: {
                              ...current.menu,
                              items: current.menu.items.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            },
                          }))
                        }
                        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-red-200 text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        menu: {
                          ...current.menu,
                          items: [
                            ...current.menu.items,
                            { ...emptyItem(), itemId: "" },
                          ],
                        },
                      }))
                    }
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"
                  >
                    <Plus size={15} />
                    Add Custom Item
                  </button>
                </div>
              )}

              <TextArea
                label="Menu Notes"
                value={form.menu.notes}
                onChange={(value) => setField("menu.notes", value)}
              />
            </FormSection>

            <FormSection title="Extra Services">
              {form.addons.map((addon, index) => (
                <div
                  key={`${index}-${addon.type}`}
                  className="grid gap-2 rounded-xl border border-[var(--border)] p-3 md:grid-cols-5"
                >
                  <SelectField
                    label="Service"
                    value={addon.type}
                    onChange={(value) =>
                      setField(`addons.${index}.type`, value)
                    }
                    options={ADDON_TYPES}
                  />

                  <Field
                    label="Name"
                    value={addon.name}
                    onChange={(value) =>
                      setField(`addons.${index}.name`, value)
                    }
                  />

                  <Field
                    label={addon.type === "EXTRA_HOURS" ? "Hours" : "Quantity"}
                    type="number"
                    min="0.01"
                    step={addon.type === "EXTRA_HOURS" ? "0.5" : "1"}
                    value={addon.quantity}
                    onChange={(value) =>
                      setField(`addons.${index}.quantity`, value)
                    }
                  />

                  <Field
                    label="Unit Price"
                    type="number"
                    min="0"
                    value={addon.unitPrice}
                    onChange={(value) =>
                      setField(`addons.${index}.unitPrice`, value)
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        addons: current.addons.filter(
                          (_, addonIndex) => addonIndex !== index,
                        ),
                      }))
                    }
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-red-200 text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    addons: [...current.addons, emptyAddon()],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"
              >
                <Plus size={15} />
                Add Service
              </button>
            </FormSection>
            </>
            )}

            {showBilling && (
            <>
            <FormSection title="Billing & Advance">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {form.menu.source === "PACKAGE" ? (
                  <>
                    <SelectField
                      label="Pricing Type"
                      value={form.pricing.pricingType}
                      onChange={(value) =>
                        setField("pricing.pricingType", value)
                      }
                      options={["PER_PLATE", "FLAT"]}
                    />
                    {form.pricing.pricingType === "PER_PLATE" ? (
                      <Field
                        label="Per Plate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.pricing.perPlate}
                        onChange={(value) =>
                          setField("pricing.perPlate", value)
                        }
                      />
                    ) : (
                      <Field
                        label="Base Food Amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.pricing.baseAmount}
                        onChange={(value) =>
                          setField("pricing.baseAmount", value)
                        }
                      />
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
                    <p className="text-xs font-bold text-[var(--text-secondary)]">
                      Custom Menu Pricing
                    </p>
                    <p className="mt-1 text-sm">
                      Food amount is calculated from the custom menu item
                      quantities and prices.
                    </p>
                  </div>
                )}

                <SelectField
                  label="Discount Type"
                  value={form.pricing.discountType}
                  onChange={(value) => setField("pricing.discountType", value)}
                  options={DISCOUNT_TYPES}
                />

                <Field
                  label="Discount Value"
                  type="number"
                  min="0"
                  value={form.pricing.discountValue}
                  onChange={(value) => setField("pricing.discountValue", value)}
                />

                <SelectField
                  label="Tax Type"
                  value={form.pricing.taxType}
                  onChange={(value) => setField("pricing.taxType", value)}
                  options={TAX_TYPES}
                />

                <Field
                  label="Tax Value"
                  type="number"
                  min="0"
                  value={form.pricing.taxValue}
                  onChange={(value) => setField("pricing.taxValue", value)}
                />

                {!editMode ? (
                  <Field
                    label="Advance / Token Money"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.payment.advanceAmount}
                    onChange={(value) =>
                      setField("payment.advanceAmount", value)
                    }
                  />
                ) : (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
                    <p className="text-xs font-bold text-[var(--text-secondary)]">
                      Amount Already Paid
                    </p>
                    <p className="mt-1 text-sm font-black">
                      {money(form.payment.advanceAmount)}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      Use Add Payment to record further payments.
                    </p>
                  </div>
                )}

                {!editMode && (
                  <SelectField
                    label="Advance Payment Mode"
                    value={form.payment.method}
                    onChange={(value) => setField("payment.method", value)}
                    options={PAYMENT_METHODS}
                  />
                )}

                {!editMode && (
                  <SelectField
                    label="Initial Status"
                    value={form.status}
                    onChange={(value) => setField("status", value)}
                    options={["TENTATIVE", "CONFIRMED"]}
                  />
                )}
              </div>

              {!editMode && (
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Payment Reference"
                    value={form.payment.referenceNumber}
                    onChange={(value) =>
                      setField("payment.referenceNumber", value)
                    }
                  />
                  <Field
                    label="Payment Notes"
                    value={form.payment.notes}
                    onChange={(value) => setField("payment.notes", value)}
                  />
                </div>
              )}

              <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Summary
                    label="Food"
                    value={money(pricingPreview.foodAmount)}
                  />
                  <Summary
                    label="Services"
                    value={money(pricingPreview.addonAmount)}
                  />
                  <Summary
                    label="Subtotal"
                    value={money(pricingPreview.subtotal)}
                  />
                  <Summary
                    label="Discount"
                    value={`-${money(pricingPreview.discount)}`}
                  />
                  <Summary
                    label="Estimated Total"
                    value={money(pricingPreview.total)}
                    strong
                  />
                </div>

                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  This is only an estimate. The backend remains authoritative
                  for final pricing.
                </p>
              </div>
            </FormSection>

            <FormSection title="Notes">
              <TextArea
                label="Schedule Notes"
                value={form.schedule.notes}
                onChange={(value) => setField("schedule.notes", value)}
              />

              <TextArea
                label="Internal Notes"
                value={form.internalNotes}
                onChange={(value) => setField("internalNotes", value)}
              />
            </FormSection>
            </>
            )}
          </form>
        </Modal>
      )}

      {packageFormOpen && (
        <Modal
          title={editingPackageId ? "Edit Package" : "Create Package"}
          subtitle="Reusable banquet menu with fixed per-plate or flat pricing"
          onClose={() => {
            if (!packageSaving) setPackageFormOpen(false);
          }}
          wide
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={packageSaving}
                onClick={() => setPackageFormOpen(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={packageSaving}
                onClick={submitPackage}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {packageSaving && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {editingPackageId ? "Save Package" : "Create Package"}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <FormSection title="Package Details">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Package Name"
                  value={packageForm.name}
                  onChange={(value) =>
                    setPackageForm((current) => ({ ...current, name: value }))
                  }
                  required
                />
                <Field
                  label="Code (optional)"
                  value={packageForm.code}
                  onChange={(value) =>
                    setPackageForm((current) => ({ ...current, code: value }))
                  }
                />
                <SelectField
                  label="Pricing Type"
                  value={packageForm.pricingType}
                  onChange={(value) =>
                    setPackageForm((current) => ({
                      ...current,
                      pricingType: value,
                    }))
                  }
                  options={[
                    { value: "PER_PLATE", label: "Per Plate" },
                    { value: "FLAT", label: "Flat Amount" },
                  ]}
                />
                <Field
                  label={
                    packageForm.pricingType === "FLAT"
                      ? "Flat Price (₹)"
                      : "Price Per Plate (₹)"
                  }
                  type="number"
                  min="0"
                  value={packageForm.price}
                  onChange={(value) =>
                    setPackageForm((current) => ({ ...current, price: value }))
                  }
                  required
                />
              </div>
              <TextArea
                label="Description"
                value={packageForm.description}
                onChange={(value) =>
                  setPackageForm((current) => ({
                    ...current,
                    description: value,
                  }))
                }
              />
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={packageForm.isActive !== false}
                  onChange={(event) =>
                    setPackageForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                />
                Package is active and available for booking
              </label>
            </FormSection>

            <FormSection title="Menu Items (optional)">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-bold text-slate-600">
                    Add from restaurant menu
                  </p>
                  <input
                    type="search"
                    value={packageMenuSearch}
                    onChange={(event) =>
                      setPackageMenuSearch(event.target.value)
                    }
                    placeholder="Search dishes…"
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] sm:max-w-xs"
                  />
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {menuCatalog
                    .filter((item) => item?.isAvailable !== false)
                    .filter((item) =>
                      `${item.name || ""} ${item.category || ""}`
                        .toLowerCase()
                        .includes(packageMenuSearch.trim().toLowerCase()),
                    )
                    .slice(0, 40)
                    .map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => {
                          setPackageForm((current) => {
                            const exists = current.items.some(
                              (row) =>
                                String(row.menuItemId || "") ===
                                String(item._id),
                            );
                            if (exists) return current;
                            return {
                              ...current,
                              items: [
                                ...current.items,
                                {
                                  menuItemId: item._id,
                                  name: item.name,
                                  quantity: 1,
                                  price: Number(item.price || 0),
                                  notes: "",
                                },
                              ],
                            };
                          });
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-left text-sm hover:border-[var(--primary)]/40"
                      >
                        <span className="font-semibold text-slate-800">
                          {item.name}
                        </span>
                        <span className="font-bold text-slate-600">
                          {money(item.price)}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                {packageForm.items.map((item, index) => (
                  <div
                    key={`${item.menuItemId || item.name}-${index}`}
                    className="grid gap-2 rounded-xl border border-[var(--border)] p-3 md:grid-cols-5"
                  >
                    <Field
                      label="Item"
                      value={item.name}
                      onChange={(value) =>
                        setPackageForm((current) => ({
                          ...current,
                          items: current.items.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, name: value } : row,
                          ),
                        }))
                      }
                    />
                    <Field
                      label="Qty"
                      type="number"
                      min="0.01"
                      value={item.quantity}
                      onChange={(value) =>
                        setPackageForm((current) => ({
                          ...current,
                          items: current.items.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, quantity: value }
                              : row,
                          ),
                        }))
                      }
                    />
                    <Field
                      label="Price"
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(value) =>
                        setPackageForm((current) => ({
                          ...current,
                          items: current.items.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, price: value } : row,
                          ),
                        }))
                      }
                    />
                    <Field
                      label="Notes"
                      value={item.notes}
                      onChange={(value) =>
                        setPackageForm((current) => ({
                          ...current,
                          items: current.items.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, notes: value } : row,
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPackageForm((current) => ({
                          ...current,
                          items: current.items.filter(
                            (_, rowIndex) => rowIndex !== index,
                          ),
                        }))
                      }
                      className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-red-200 text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPackageForm((current) => ({
                      ...current,
                      items: [
                        ...current.items,
                        {
                          menuItemId: "",
                          name: "",
                          quantity: 1,
                          price: 0,
                          notes: "",
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"
                >
                  <Plus size={15} /> Add custom item
                </button>
              </div>
            </FormSection>
          </div>
        </Modal>
      )}

      {detailOpen && (
        <Modal
          title={selectedEvent?.eventName || "Event Details"}
          onClose={() => setDetailOpen(false)}
          wide
        >
          {detailLoading || !selectedEvent ? (
            <div className="flex justify-center py-16">
              <Loader2
                className="animate-spin text-[var(--primary)]"
                size={28}
              />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-2xl bg-[var(--surface-muted)] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)]">
                    {selectedEvent.eventNumber}
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {selectedEvent.eventName}
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {eventTypeLabel(selectedEvent.eventType)}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${
                    EVENT_STATUS[selectedEvent.status]?.className || ""
                  }`}
                >
                  {EVENT_STATUS[selectedEvent.status]?.label ||
                    selectedEvent.status}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Info
                  title="Customer"
                  value={selectedEvent.customer?.name}
                  sub={`+91 ${displayPhone(selectedEvent.customer?.phone, "") || "—"}${
                    displayPhone(
                      selectedEvent.customer?.alternatePhone,
                      "",
                    )
                      ? ` · Alt ${displayPhone(selectedEvent.customer?.alternatePhone, "")}`
                      : ""
                  }`}
                  icon={UserRound}
                />

                <Info
                  title="Schedule"
                  value={dateLabel(eventDate(selectedEvent))}
                  sub={`${timeLabel(
                    selectedEvent.schedule?.startTime,
                  )} – ${timeLabel(selectedEvent.schedule?.endTime)}`}
                  icon={Clock3}
                />

                <Info
                  title="Venue"
                  value={selectedEvent.venue?.name || selectedEvent.venue}
                  sub={selectedEvent.venue?.seatingArrangement || "—"}
                  icon={MapPin}
                />

                <Info
                  title="Guests"
                  value={String(
                    selectedEvent.guests?.expected ?? selectedEvent.guests ?? 0,
                  )}
                  sub={`Guaranteed ${selectedEvent.guests?.guaranteed || 0}`}
                  icon={Users}
                />
              </div>

              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="mb-3 text-sm font-black">Financial Summary</p>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Summary
                    label="Food"
                    value={money(selectedEvent.pricing?.foodAmount)}
                  />

                  <Summary
                    label="Services"
                    value={money(selectedEvent.pricing?.addonAmount)}
                  />

                  <Summary
                    label="Total"
                    value={money(selectedEvent.pricing?.totalAmount)}
                    strong
                  />

                  <Summary
                    label="Paid"
                    value={money(selectedEvent.payment?.paidAmount)}
                  />

                  <Summary
                    label="Due"
                    value={money(selectedEvent.payment?.dueAmount)}
                  />
                </div>
              </div>

              {selectedEvent.menu?.items?.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <p className="mb-3 text-sm font-black">Menu Snapshot</p>

                  <div className="space-y-2">
                    {selectedEvent.menu.items.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex justify-between gap-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm"
                      >
                        <span>{item.name}</span>

                        <span className="font-bold">
                          {item.quantity} × {money(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.addons?.length > 0 && (
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <p className="mb-3 text-sm font-black">Extra Services</p>

                  <div className="space-y-2">
                    {selectedEvent.addons.map((addon, index) => (
                      <div
                        key={index}
                        className="flex justify-between gap-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm"
                      >
                        <span>{addon.name}</span>

                        <span className="font-bold">
                          {money(
                            addon.amount ??
                              Number(addon.quantity || 0) *
                                Number(addon.unitPrice || 0),
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  onClick={openEdit}
                  disabled={["COMPLETED", "CANCELLED"].includes(
                    selectedEvent.status,
                  )}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold disabled:opacity-40"
                >
                  <Edit3 size={16} />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  disabled={
                    selectedEvent.status === "CANCELLED" ||
                    Number(eventDue(selectedEvent)) <= 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  <WalletCards size={16} />
                  Add Payment
                </button>

                {selectedEvent.status === "TENTATIVE" && (
                  <button
                    type="button"
                    onClick={() => updateStatus("CONFIRMED")}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"
                  >
                    Confirm
                  </button>
                )}

                {selectedEvent.status === "CONFIRMED" && (
                  <button
                    type="button"
                    onClick={() => updateStatus("IN_PROGRESS")}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700"
                  >
                    Start Event
                  </button>
                )}

                {selectedEvent.status === "IN_PROGRESS" && (
                  <button
                    type="button"
                    onClick={() => updateStatus("COMPLETED")}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700"
                  >
                    Complete
                  </button>
                )}

                {!["COMPLETED", "CANCELLED"].includes(selectedEvent.status) && (
                  <button
                    type="button"
                    onClick={() => updateStatus("CANCELLED")}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700"
                  >
                    Cancel Event
                  </button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {paymentOpen && (
        <Modal title="Record Payment" onClose={() => setPaymentOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--surface-muted)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Current Due</p>
              <p className="mt-1 text-2xl font-black">
                {money(eventDue(selectedEvent))}
              </p>
            </div>

            <Field
              label="Payment Amount (₹)"
              type="number"
              min="0.01"
              step="0.01"
              value={paymentAmount}
              onChange={setPaymentAmount}
              required
            />

            <SelectField
              label="Payment Mode"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_METHODS}
            />

            <Field
              label="Reference Number"
              value={paymentReference}
              onChange={setPaymentReference}
            />

            <TextArea
              label="Payment Notes"
              value={paymentNotes}
              onChange={setPaymentNotes}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="rounded-xl border px-4 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={addPayment}
                disabled={paymentSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {paymentSaving && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Save Payment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
