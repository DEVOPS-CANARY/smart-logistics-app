import { ShipmentUpdate } from "./types";
import { API_BASE_URL } from "./api-base";

function buildQueryString(
  params: Record<string, string | number | undefined | null>
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

function clearAuthAndRedirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  const hasToken = Boolean(localStorage.getItem("access_token"));
  const hasUser = Boolean(localStorage.getItem("auth_user"));
  if (!hasToken && !hasUser) {
    return;
  }

  const refreshToken = localStorage.getItem("refresh_token");
  if (refreshToken) {
    fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    }).catch(() => {});
  }

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("auth_user");
  window.location.href = "/login";
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    return false;
  }

  // Deduplicate concurrent refresh attempts
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!res.ok) {
        return false;
      }

      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        user: { id: string; email: string; role: string };
      };

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function handleFetchError(
  res: Response,
  fallbackMessage: string
): Promise<never> {
  let message = fallbackMessage;

  try {
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await res.json()) as {
        message?: string | string[];
        error?: string;
      };

      if (Array.isArray(payload.message) && payload.message.length > 0) {
        message = payload.message.join(", ");
      } else if (typeof payload.message === "string" && payload.message) {
        message = payload.message;
      } else if (typeof payload.error === "string" && payload.error) {
        message = payload.error;
      }
    } else {
      const text = await res.text();
      if (text) {
        message = text;
      }
    }
  } catch {
    // Keep the fallback message if the response body can't be parsed.
  }

  if (res.status === 401 || res.status === 403) {
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      clearAuthAndRedirectToLogin();
    }
  }

  throw new Error(message);
}

export type Shipment = {
  id: string;
  title: string;
  description?: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  createdById: string;
  assignedCourierId?: string | null;
  createdAt: string;
  createdBy?: {
    id: string;
    email: string;
    role: string;
  };
  assignedCourier?: {
    id: string;
    userId: string;
    vehicleType?: string | null;
    availability?: boolean;
    user: {
      id: string;
      email: string;
      role: string;
    };
  } | null;
};

export type Courier = {
  id: string;
  userId: string;
  vehicleType?: string | null;
  availability?: boolean;
  createdAt?: string;
  _count?: {
    shipments: number;
  };
  user: {
    id: string;
    email: string;
    role: string;
    createdAt: string;
  };
};

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  courier?: {
    id: string;
    userId: string;
    vehicleType?: string | null;
    availability?: boolean;
    createdAt: string;
    _count?: {
      shipments: number;
    };
  } | null;
};

export type ShipmentFilters = {
  search?: string;
  status?: string;
  assignedCourierId?: string;
  sortBy?: "createdAt" | "title" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type AuditLog = {
  id: string;
  actorUserId?: string | null;
  actionType: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    role: string;
  } | null;
};

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE_URL}/users`, {
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to fetch users");
  }

  return res.json();
}

export async function updateUserRole(userId: string, role: string) {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({ role })
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to update user role");
  }

  return res.json();
}

export async function fetchCouriers(): Promise<Courier[]> {
  const res = await fetch(`${API_BASE_URL}/couriers`, {
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to fetch couriers");
  }

  return res.json();
}

export async function updateMyCourierAvailability(availability: boolean) {
  const res = await fetch(`${API_BASE_URL}/couriers/me/availability`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({ availability })
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to update courier availability");
  }

  return res.json();
}

export async function fetchMyCourier(): Promise<Courier | null> {
  const res = await fetch(`${API_BASE_URL}/couriers/me`, {
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to fetch courier profile");
  }

  return res.json();
}

export async function assignCourierToShipment(
  shipmentId: string,
  courierId: string
) {
  const res = await fetch(
    `${API_BASE_URL}/shipments/${shipmentId}/assign-courier`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ courierId })
    }
  );

  if (!res.ok) {
    await handleFetchError(res, "Failed to assign courier");
  }

  return res.json();
}

export type CreateShipmentInput = {
  title: string;
  description?: string;
  pickupAddress: string;
  deliveryAddress: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function fetchShipments(
  filters: ShipmentFilters = {}
): Promise<PaginatedResponse<Shipment>> {
  const res = await fetch(
    `${API_BASE_URL}/shipments${buildQueryString(filters)}`,
    {
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  if (!res.ok) {
    await handleFetchError(res, "Failed to fetch shipments");
  }
  return res.json();
}

export async function fetchShipmentById(shipmentId: string): Promise<Shipment> {
  const res = await fetch(`${API_BASE_URL}/shipments/${shipmentId}`, {
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to fetch shipment details");
  }
  return res.json();
}

export async function createShipment(
  input: CreateShipmentInput
): Promise<Shipment> {
  const res = await fetch(`${API_BASE_URL}/shipments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to create shipment");
  }

  return res.json();
}

export async function updateShipment(
  shipmentId: string,
  input: Partial<CreateShipmentInput>
): Promise<Shipment> {
  const res = await fetch(`${API_BASE_URL}/shipments/${shipmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to update shipment");
  }

  return res.json();
}

export async function cancelShipment(shipmentId: string): Promise<Shipment> {
  const res = await fetch(`${API_BASE_URL}/shipments/${shipmentId}/cancel`, {
    method: "POST",
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to cancel shipment");
  }

  return res.json();
}

export type RegisterInput = {
  email: string;
  password: string;
};

export async function registerUser(input: RegisterInput) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to register");
  }

  return res.json();
}

export type LoginInput = {
  email: string;
  password: string;
};

export async function loginUser(input: LoginInput) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to login");
  }

  return res.json();
}

export type ShipmentMetrics = {
  total: number;
  delivered: number;
  pickedUp?: number;
  inTransit: number;
  assigned: number;
  created: number;
  cancelled?: number;
};

export async function fetchShipmentMetrics(): Promise<ShipmentMetrics> {
  const res = await fetch(`${API_BASE_URL}/shipments/metrics`, {
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to fetch shipment metrics");
  }

  return res.json();
}

export type CreateTrackingEventInput = {
  status: string;
  locationLat?: number;
  locationLng?: number;
  note?: string;
};

export async function createTrackingEvent(
  shipmentId: string,
  input: CreateTrackingEventInput
) {
  const res = await fetch(`${API_BASE_URL}/shipments/${shipmentId}/tracking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to create tracking event");
  }

  return res.json();
}

export async function fetchTrackingEvents(
  shipmentId: string
): Promise<ShipmentUpdate[]> {
  const res = await fetch(`${API_BASE_URL}/shipments/${shipmentId}/tracking`, {
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to fetch tracking events");
  }

  return res.json();
}

export type UserProfile = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  courier?: {
    id: string;
    vehicleType?: string | null;
    availability?: boolean;
  } | null;
};

export async function fetchMyProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      ...getAuthHeaders()
    }
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to fetch profile");
  }

  return res.json();
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to change password");
  }

  return res.json();
}

export async function changeEmail(input: {
  newEmail: string;
  currentPassword: string;
}) {
  const res = await fetch(`${API_BASE_URL}/auth/change-email`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    await handleFetchError(res, "Failed to change email");
  }

  return res.json();
}

export async function fetchAuditLogs(
  params: {
    actionType?: string;
    targetType?: string;
    actorUserId?: string;
    targetId?: string;
    sortOrder?: "asc" | "desc";
  } = {}
): Promise<AuditLog[]> {
  const res = await fetch(
    `${API_BASE_URL}/audit-logs${buildQueryString(params)}`,
    {
      headers: {
        ...getAuthHeaders()
      }
    }
  );

  if (!res.ok) {
    await handleFetchError(res, "Failed to fetch audit logs");
  }

  return res.json();
}
