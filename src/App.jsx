
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "https://contract-final-1.onrender.com/api/contracts";
const USERS_API = "https://contract-final-1.onrender.com/api/users";
const TELEGRAM_API = "https://contract-final-1.onrender.com/api/telegram";

const EMPTY_FORM = {
  contractName: "",
  partyName: "",
  description: "",
  startDate: "",
  endDate: "",
};

const EMPTY_USER = {
  name: "",
  whatsappNumber: "",
};

function getTodayLocal() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return "—";

  const parts = String(date).slice(0, 10).split("-");
  if (parts.length !== 3) return date;

  const [year, month, day] = parts;
  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
}

function getDaysLeft(endDate) {
  if (!endDate) return null;

  const today = getTodayLocal();
  const todayDate = new Date(`${today}T00:00:00`);
  const end = new Date(`${String(endDate).slice(0, 10)}T00:00:00`);

  return Math.round(
    (end.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getDaysClass(days, status) {
  if (status === "EXPIRED") return "expired";
  if (days <= 30) return "low";
  if (days <= 90) return "medium";
  return "high";
}

function App() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expirySlideIndex, setExpirySlideIndex] = useState(0);
  const [expiredSlideIndex, setExpiredSlideIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // User management states
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userDeletingId, setUserDeletingId] = useState(null);
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState(EMPTY_USER);

  // Telegram states
  const [telegramLoadingId, setTelegramLoadingId] = useState(null);
  const [telegramLinks, setTelegramLinks] = useState({});

  // Load contracts
  const loadContracts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(API);
      setContracts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load contracts. Please check your backend connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  // Load registered users
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      setUserError("");
      setUserSuccess("");

      const response = await axios.get(USERS_API);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Users fetch error:", err);
      setUserError(
        err.response?.data?.message ||
          "Unable to load users. Please check your backend connection."
      );
    } finally {
      setUsersLoading(false);
    }
  };

  // Open Manage Users page
  const openUsersPage = () => {
    setCurrentPage("users");
    setShowUserForm(false);
    setUserError("");
    setUserSuccess("");
    loadUsers();
  };

  // Open dashboard
  const openDashboard = () => {
    setCurrentPage("dashboard");
    setUserError("");
    setUserSuccess("");
  };

  // Open All Contracts page
  const openContractsPage = () => {
    setCurrentPage("contracts");
    setError("");
  };

  // User form
  const handleUserChange = (event) => {
    const { name, value } = event.target;

    setUserForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openUserForm = () => {
    setUserForm(EMPTY_USER);
    setUserError("");
    setUserSuccess("");
    setShowUserForm(true);
  };

  const closeUserForm = () => {
    if (userSaving) return;

    setShowUserForm(false);
    setUserForm(EMPTY_USER);
  };

  // Save new user
  const saveUser = async (event) => {
    event.preventDefault();

    try {
      setUserSaving(true);
      setUserError("");
      setUserSuccess("");

      await axios.post(USERS_API, {
        name: userForm.name.trim(),
        whatsappNumber: userForm.whatsappNumber.trim(),
      });

      setShowUserForm(false);
      setUserForm(EMPTY_USER);

      await loadUsers();

      setUserSuccess("User added successfully!");
    } catch (err) {
      console.error("Add user error:", err);

      setUserError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to add user. Check the WhatsApp number or try again."
      );
    } finally {
      setUserSaving(false);
    }
  };

  // Delete user
  const deleteUser = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmed) return;

    try {
      setUserDeletingId(id);
      setUserError("");
      setUserSuccess("");

      await axios.delete(`${USERS_API}/${id}`);

      setTelegramLinks((previous) => {
        const updated = { ...previous };
        delete updated[id];
        return updated;
      });

      await loadUsers();

      setUserSuccess("User deleted successfully!");
    } catch (err) {
      console.error("Delete user error:", err);

      setUserError(
        err.response?.data?.message ||
          "Unable to delete user. Please try again."
      );
    } finally {
      setUserDeletingId(null);
    }
  };

  // Generate Telegram connection link
  const connectTelegram = async (userId) => {
    try {
      setTelegramLoadingId(userId);
      setUserError("");
      setUserSuccess("");

      const response = await axios.post(
        `${TELEGRAM_API}/generate-link/${userId}`
      );

      const link = response.data?.link;

      if (!link) {
        throw new Error("Telegram link was not returned by the server.");
      }

      setTelegramLinks((previous) => ({
        ...previous,
        [userId]: link,
      }));

      setUserSuccess(
        "Telegram connection link generated. Open Telegram and press Start."
      );
    } catch (err) {
      console.error("Telegram connection error:", err);

      setUserError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate Telegram connection link."
      );
    } finally {
      setTelegramLoadingId(null);
    }
  };

  // Contract status
  const getStatus = (contract) => {
    const today = getTodayLocal();

    const start = contract.startDate
      ? String(contract.startDate).slice(0, 10)
      : "";

    const end = contract.endDate
      ? String(contract.endDate).slice(0, 10)
      : "";

    if (start && start > today) return "UPCOMING";
    if (end && end <= today) return "EXPIRED";

    if (end) {
      const daysLeft = getDaysLeft(end);
      if (daysLeft >= 1 && daysLeft <= 5) return "EXPIRING_SOON";
    }

    return "ACTIVE";
  };

  // Contract forms
  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (contract) => {
    setEditingId(contract.id);

    setForm({
      contractName: contract.contractName || "",
      partyName: contract.partyName || "",
      description: contract.description || "",
      startDate: contract.startDate
        ? String(contract.startDate).slice(0, 10)
        : "",
      endDate: contract.endDate
        ? String(contract.endDate).slice(0, 10)
        : "",
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const saveContract = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editingId !== null) {
        await axios.put(`${API}/${editingId}`, form);
      } else {
        await axios.post(API, form);
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadContracts();
    } catch (err) {
      console.error("Save error:", err);
      setError(
        err.response?.data?.message ||
          `Unable to ${
            editingId !== null ? "update" : "add"
          } the contract. Please try again.`
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteContract = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this contract?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await axios.delete(`${API}/${id}`);
      await loadContracts();
    } catch (err) {
      console.error("Delete error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to delete this contract. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Search and status filtering
  const filteredContracts = contracts.filter((contract) => {
    const searchText = `${contract.contractName || ""} ${
      contract.partyName || ""
    }`.toLowerCase();

    const matchesSearch = searchText.includes(search.trim().toLowerCase());
    const status = getStatus(contract);
    const daysLeft = getDaysLeft(contract.endDate);

    let matchesStatus = true;

    if (statusFilter === "ACTIVE") {
      matchesStatus =
        status === "ACTIVE" && (daysLeft === null || daysLeft > 5);
    } else if (statusFilter === "EXPIRING_SOON") {
      matchesStatus = status === "EXPIRING_SOON";
    } else if (statusFilter === "UPCOMING") {
      matchesStatus = status === "UPCOMING";
    } else if (statusFilter === "EXPIRED") {
      matchesStatus = status === "EXPIRED";
    }

    return matchesSearch && matchesStatus;
  });

  // Dashboard statistics
  const total = contracts.length;

  const active = contracts.filter(
    (contract) => getStatus(contract) === "ACTIVE"
  ).length;

  const upcoming = contracts.filter(
    (contract) => getStatus(contract) === "UPCOMING"
  ).length;

  const expired = contracts.filter(
    (contract) => getStatus(contract) === "EXPIRED"
  ).length;

  // Expired contracts
  const expiredContracts = contracts
    .filter((contract) => getStatus(contract) === "EXPIRED")
    .sort((a, b) => getDaysLeft(b.endDate) - getDaysLeft(a.endDate));

  // Contracts expiring in 1–5 days
  const expiringSoonContracts = contracts
    .filter((contract) => getStatus(contract) === "EXPIRING_SOON")
    .sort((a, b) => getDaysLeft(a.endDate) - getDaysLeft(b.endDate));

  // Expiry alert automatic slider
  useEffect(() => {
    if (expiringSoonContracts.length <= 1) {
      setExpirySlideIndex(0);
      return;
    }

    const slideTimer = setInterval(() => {
      setExpirySlideIndex(
        (current) => (current + 1) % expiringSoonContracts.length
      );
    }, 4500);

    return () => clearInterval(slideTimer);
  }, [expiringSoonContracts.length]);

  const visibleExpiryAlert =
    expiringSoonContracts.length > 0
      ? expiringSoonContracts[
          expirySlideIndex % expiringSoonContracts.length
        ]
      : null;

  // Expired contracts automatic slider
  useEffect(() => {
    if (expiredContracts.length <= 1) {
      setExpiredSlideIndex(0);
      return;
    }

    const expiredTimer = setInterval(() => {
      setExpiredSlideIndex(
        (current) => (current + 1) % expiredContracts.length
      );
    }, 4500);

    return () => clearInterval(expiredTimer);
  }, [expiredContracts.length]);

  const visibleExpiredContract =
    expiredContracts.length > 0
      ? expiredContracts[expiredSlideIndex % expiredContracts.length]
      : null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">C</div>
          <div>
            <h2>ContractPro</h2>
            <span>Management System</span>
          </div>
        </div>

        <p className="menu-title">MAIN MENU</p>

        <button
          className={`nav-item nav-button ${
            currentPage === "dashboard" ? "active" : ""
          }`}
          onClick={openDashboard}
        >
          <span>▦</span> Dashboard
        </button>

        <button
          className={`nav-item nav-button ${
            currentPage === "contracts" ? "active" : ""
          }`}
          onClick={openContractsPage}
        >
          <span>▤</span> All Contracts
        </button>

        <button className="nav-item nav-button" onClick={openAddForm}>
          <span>＋</span> Add Contract
        </button>

        <button
          className={`nav-item nav-button ${
            currentPage === "users" ? "active" : ""
          }`}
          onClick={openUsersPage}
        >
          <span>👥</span> Manage Users
        </button>
      </aside>

      <main className="main">

        {/* DASHBOARD PAGE */}
        {currentPage === "dashboard" && (
          <>
            <header className="topbar">
              <div>
                <h1>Dashboard</h1>
                <p>Contract overview at a glance</p>
              </div>
            </header>

            <section
              className="dashboard-overview"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(230px, 0.72fr) minmax(360px, 1.28fr)",
                gap: "22px",
                alignItems: "stretch",
                width: "100%",
              }}
            >

              {/* LEFT SIDE - STATISTICS */}
              <div
                className="dashboard-stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gridTemplateRows: "repeat(4, 1fr)",
                  gap: "14px",
                  alignContent: "stretch",
                  minHeight: 0,
                }}
              >
                <div className="stat-card">
                  <div className="stat-icon blue">▤</div>
                  <p>Total Contracts</p>
                  <h2>{total}</h2>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green">✓</div>
                  <p>Active Contracts</p>
                  <h2>{active}</h2>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange">◷</div>
                  <p>Upcoming Contracts</p>
                  <h2>{upcoming}</h2>
                </div>

                <div className="stat-card">
                  <div className="stat-icon red">!</div>
                  <p>Expired Contracts</p>
                  <h2>{expired}</h2>
                </div>
              </div>

              {/* RIGHT SIDE - ALERT BOXES */}
              <div
                className="dashboard-alerts-column"
                style={{
                  display: "grid",
                  gridTemplateRows: "1fr 1fr",
                  gap: "18px",
                  minWidth: 0,
                  minHeight: 0,
                }}
              >

                {/* 1. EXPIRED CONTRACTS - TOP BOX */}
                <section
                  className="expired-contracts-panel"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "14px",
                    padding: "18px",
                    minHeight: 0,
                    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          color: "#172554",
                        }}
                      >
                        Expired Contracts
                      </h2>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#64748B",
                          fontSize: "13px",
                        }}
                      >
                        Contracts that have passed their end date
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: "20px",
                        background: "#FEF2F2",
                        color: "#B91C1C",
                        fontSize: "12px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {expiredContracts.length} EXPIRED
                    </span>
                  </div>

                  {visibleExpiredContract ? (
                    <div
                      key={visibleExpiredContract.id}
                      style={{
                        flex: 1,
                        border: "1px solid #FEE2E2",
                        borderLeft: "4px solid #EF4444",
                        borderRadius: "10px",
                        background: "#FFFAFA",
                        padding: "15px",
                        animation: "expiryAlertFade 0.45s ease",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          style={{
                            color: "#B91C1C",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          EXPIRED CONTRACT
                        </span>

                        <span
                          style={{
                            padding: "5px 9px",
                            borderRadius: "20px",
                            background: "#FEE2E2",
                            color: "#B91C1C",
                            fontSize: "12px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {Math.abs(
                            getDaysLeft(visibleExpiredContract.endDate)
                          )} days ago
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: "0 0 7px",
                          color: "#1E293B",
                          fontSize: "16px",
                        }}
                      >
                        {visibleExpiredContract.contractName ||
                          "Untitled contract"}
                      </h3>

                      <p
                        style={{
                          margin: "0 0 10px",
                          color: "#64748B",
                          fontSize: "13px",
                        }}
                      >
                        Party: {visibleExpiredContract.partyName || "—"}
                      </p>

                      <div
                        style={{
                          borderTop: "1px solid #FECACA",
                          paddingTop: "9px",
                        }}
                      >
                        <span
                          style={{
                            color: "#64748B",
                            fontSize: "12px",
                          }}
                        >
                          End date
                        </span>

                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#334155",
                            fontSize: "14px",
                            fontWeight: 600,
                          }}
                        >
                          {formatDate(visibleExpiredContract.endDate)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        minHeight: "100px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#F8FAFC",
                        borderRadius: "10px",
                        color: "#64748B",
                        fontSize: "13px",
                      }}
                    >
                      No expired contracts.
                    </div>
                  )}

                  {expiredContracts.length > 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "12px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpiredSlideIndex(
                            (current) =>
                              (current - 1 + expiredContracts.length) %
                              expiredContracts.length
                          )
                        }
                        aria-label="Previous expired contract"
                        style={{
                          border: "1px solid #E2E8F0",
                          borderRadius: "7px",
                          background: "#FFFFFF",
                          color: "#475569",
                          padding: "5px 11px",
                          cursor: "pointer",
                        }}
                      >
                        ←
                      </button>

                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                        }}
                      >
                        {expiredContracts.map((contract, index) => (
                          <button
                            key={contract.id}
                            type="button"
                            onClick={() => setExpiredSlideIndex(index)}
                            aria-label={`Show expired contract ${index + 1}`}
                            style={{
                              width:
                                index === expiredSlideIndex ? "18px" : "7px",
                              height: "7px",
                              border: 0,
                              borderRadius: "10px",
                              padding: 0,
                              background:
                                index === expiredSlideIndex
                                  ? "#EF4444"
                                  : "#CBD5E1",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpiredSlideIndex(
                            (current) =>
                              (current + 1) % expiredContracts.length
                          )
                        }
                        aria-label="Next expired contract"
                        style={{
                          border: "1px solid #E2E8F0",
                          borderRadius: "7px",
                          background: "#FFFFFF",
                          color: "#475569",
                          padding: "5px 11px",
                          cursor: "pointer",
                        }}
                      >
                        →
                      </button>
                    </div>
                  )}
                </section>

                {/* 2. EXPIRY ALERTS - BOTTOM BOX */}
                <section
                  className="expiry-alert-panel"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "14px",
                    padding: "18px",
                    minHeight: 0,
                    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          color: "#172554",
                        }}
                      >
                        Expiry Alerts
                      </h2>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#64748B",
                          fontSize: "13px",
                        }}
                      >
                        Contracts ending in the next 5 days
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: "20px",
                        background: "#FFF7ED",
                        color: "#C2410C",
                        fontSize: "12px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {expiringSoonContracts.length}{" "}
                      {expiringSoonContracts.length === 1
                        ? "ALERT"
                        : "ALERTS"}
                    </span>
                  </div>

                  {visibleExpiryAlert ? (
                    <div
                      key={visibleExpiryAlert.id}
                      className="expiry-alert-slide"
                      style={{
                        flex: 1,
                        border: "1px solid #FED7AA",
                        borderLeft: "4px solid #F97316",
                        borderRadius: "10px",
                        background: "#FFFBF5",
                        padding: "15px",
                        animation: "expiryAlertFade 0.45s ease",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          style={{
                            color: "#9A3412",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          EXPIRING SOON
                        </span>

                        <span
                          style={{
                            color: "#B45309",
                            background: "#FEF3C7",
                            borderRadius: "20px",
                            padding: "5px 9px",
                            fontSize: "12px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getDaysLeft(visibleExpiryAlert.endDate)} days left
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: "0 0 7px",
                          color: "#1E293B",
                          fontSize: "16px",
                        }}
                      >
                        {visibleExpiryAlert.contractName ||
                          "Untitled contract"}
                      </h3>

                      <p
                        style={{
                          margin: "0 0 10px",
                          color: "#64748B",
                          fontSize: "13px",
                        }}
                      >
                        Party: {visibleExpiryAlert.partyName || "—"}
                      </p>

                      <div
                        style={{
                          borderTop: "1px solid #FDE6CC",
                          paddingTop: "9px",
                        }}
                      >
                        <span
                          style={{
                            color: "#64748B",
                            fontSize: "12px",
                          }}
                        >
                          Expiry date
                        </span>

                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#334155",
                            fontSize: "14px",
                            fontWeight: 600,
                          }}
                        >
                          {formatDate(visibleExpiryAlert.endDate)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        minHeight: "100px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        background: "#F8FAFC",
                        borderRadius: "10px",
                        padding: "15px",
                      }}
                    >
                      <div style={{ fontSize: "26px", marginBottom: "7px" }}>
                        ✓
                      </div>

                      <strong
                        style={{
                          color: "#334155",
                          fontSize: "14px",
                        }}
                      >
                        No upcoming expiries
                      </strong>

                      <p
                        style={{
                          color: "#64748B",
                          fontSize: "12px",
                          margin: "6px 0 0",
                        }}
                      >
                        No contracts are due to expire within the next 5 days.
                      </p>
                    </div>
                  )}

                  {expiringSoonContracts.length > 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "12px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpirySlideIndex(
                            (current) =>
                              (current - 1 + expiringSoonContracts.length) %
                              expiringSoonContracts.length
                          )
                        }
                        aria-label="Previous expiry alert"
                        style={{
                          border: "1px solid #E2E8F0",
                          borderRadius: "7px",
                          background: "#FFFFFF",
                          color: "#475569",
                          padding: "5px 11px",
                          cursor: "pointer",
                        }}
                      >
                        ←
                      </button>

                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                        }}
                      >
                        {expiringSoonContracts.map((contract, index) => (
                          <button
                            key={contract.id}
                            type="button"
                            onClick={() => setExpirySlideIndex(index)}
                            aria-label={`Show expiry alert ${index + 1}`}
                            style={{
                              width:
                                index === expirySlideIndex ? "18px" : "7px",
                              height: "7px",
                              border: 0,
                              borderRadius: "10px",
                              padding: 0,
                              background:
                                index === expirySlideIndex
                                  ? "#F97316"
                                  : "#CBD5E1",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpirySlideIndex(
                            (current) =>
                              (current + 1) % expiringSoonContracts.length
                          )
                        }
                        aria-label="Next expiry alert"
                        style={{
                          border: "1px solid #E2E8F0",
                          borderRadius: "7px",
                          background: "#FFFFFF",
                          color: "#475569",
                          padding: "5px 11px",
                          cursor: "pointer",
                        }}
                      >
                        →
                      </button>
                    </div>
                  )}
                </section>

              </div>
            </section>

            {/* Dashboard responsive styles */}
            <style>
              {`
                @keyframes expiryAlertFade {
                  from {
                    opacity: 0;
                    transform: translateY(7px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }

                @media (max-width: 900px) {
                  .dashboard-overview {
                    grid-template-columns: minmax(0, 1fr) !important;
                  }

                  .dashboard-alerts-column {
                    grid-template-rows: auto auto !important;
                  }

                  .dashboard-stats-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    grid-template-rows: auto auto !important;
                  }
                }

                @media (max-width: 560px) {
                  .dashboard-stats-grid {
                    grid-template-columns: minmax(0, 1fr) !important;
                  }
                }
              `}
            </style>
          </>
        )}

        {/* ALL CONTRACTS PAGE */}
        {currentPage === "contracts" && (
          <>
            <header className="topbar">
              <div>
                <h1>All Contracts</h1>
                <p>
                  View, search, filter and manage all your contract records
                </p>
              </div>

              <button className="primary-btn" onClick={openAddForm}>
                + New Contract
              </button>
            </header>

            <section className="contracts-section">
              <div className="section-header">
                <div>
                  <h2>All Contracts</h2>
                  <p>Manage all your contract records</p>
                </div>

                <button
                  className="refresh-btn"
                  onClick={loadContracts}
                  disabled={loading}
                >
                  ↻ {loading ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div
                className="contract-filters"
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "14px",
                  flexWrap: "wrap",
                  margin: "18px 0 16px",
                }}
              >
                <div
                  className="search-box"
                  style={{
                    flex: "1 1 320px",
                    maxWidth: "460px",
                    margin: 0,
                  }}
                >
                  <span>⌕</span>

                  <input
                    type="text"
                    placeholder="Search contracts or parties..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div
                  className="status-filter"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    width: "230px",
                    maxWidth: "100%",
                  }}
                >
                  <label
                    htmlFor="statusFilter"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#64748B",
                    }}
                  >
                    Status
                  </label>

                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                    style={{
                      width: "100%",
                      height: "46px",
                      padding: "0 12px",
                      border: "1px solid #D8DEE9",
                      borderRadius: "7px",
                      background: "#FFFFFF",
                      color: "#334155",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="ALL">All contracts</option>
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRING_SOON">
                      Expiring soon (1–5 days)
                    </option>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>CONTRACT NAME</th>
                      <th>PARTY NAME</th>
                      <th>START DATE</th>
                      <th>END DATE</th>
                      <th>DAYS LEFT</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="empty">
                          Loading contracts...
                        </td>
                      </tr>
                    ) : filteredContracts.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty">
                          {search || statusFilter !== "ALL"
                            ? "No contracts match the selected search or status filter."
                            : "No contracts found. Add your first contract."}
                        </td>
                      </tr>
                    ) : (
                      filteredContracts.map((contract) => {
                        const status = getStatus(contract);
                        const daysLeft = getDaysLeft(contract.endDate);
                        const daysClass = getDaysClass(daysLeft, status);

                        return (
                          <tr key={contract.id}>
                            <td className="contract-name">
                              {contract.contractName || "—"}
                            </td>

                            <td>{contract.partyName || "—"}</td>

                            <td>{formatDate(contract.startDate)}</td>

                            <td>{formatDate(contract.endDate)}</td>

                            <td>
                              {daysLeft === null ? (
                                "—"
                              ) : (
                                <span className={`days-left ${daysClass}`}>
                                  {status === "EXPIRED"
                                    ? "Expired"
                                    : `${daysLeft} days`}
                                </span>
                              )}
                            </td>

                            <td>
                              <span
                                className={`status ${status.toLowerCase()}`}
                                style={{
                                  display: "inline-block",
                                  padding: "6px 11px",
                                  borderRadius: "999px",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                  letterSpacing: "0.2px",
                                  backgroundColor:
                                    status === "EXPIRED"
                                      ? "#FEE2E2"
                                      : status === "EXPIRING_SOON"
                                      ? "#FEF3C7"
                                      : status === "UPCOMING"
                                      ? "#DBEAFE"
                                      : "#DCFCE7",
                                  color:
                                    status === "EXPIRED"
                                      ? "#B91C1C"
                                      : status === "EXPIRING_SOON"
                                      ? "#B45309"
                                      : status === "UPCOMING"
                                      ? "#1D4ED8"
                                      : "#15803D",
                                  border: `1px solid ${
                                    status === "EXPIRED"
                                      ? "#FECACA"
                                      : status === "EXPIRING_SOON"
                                      ? "#FDE68A"
                                      : status === "UPCOMING"
                                      ? "#BFDBFE"
                                      : "#BBF7D0"
                                  }`,
                                }}
                              >
                                {status === "EXPIRING_SOON"
                                  ? "EXPIRING SOON"
                                  : status}
                              </span>
                            </td>

                            <td>
                              <div className="action-buttons">
                                <button
                                  className="edit-btn"
                                  onClick={() => openEditForm(contract)}
                                >
                                  Edit
                                </button>

                                <button
                                  className="delete-btn"
                                  onClick={() =>
                                    deleteContract(contract.id)
                                  }
                                  disabled={deletingId === contract.id}
                                >
                                  {deletingId === contract.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* MANAGE USERS PAGE */}
        {currentPage === "users" && (
          <>
            <header className="topbar">
              <div>
                <h1>Manage Users</h1>
                <p>
                  Manage registered users who receive Telegram notifications.
                </p>
              </div>

              <button className="primary-btn" onClick={openUserForm}>
                + Add New User
              </button>
            </header>

            <section className="welcome-banner">
              <div>
                <h2>Telegram Notification Recipients</h2>
                <p>
                  Connect each registered user to Telegram to receive contract
                  expiry reminders.
                </p>
              </div>

              <div className="banner-symbol">📱</div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">👥</div>
                <p>Total Registered Users</p>
                <h2>{users.length}</h2>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">✓</div>
                <p>Telegram Connected</p>
                <h2>
                  {users.filter((user) => user.telegramChatId).length}
                </h2>
              </div>
            </section>

            <section className="contracts-section">
              <div className="section-header">
                <div>
                  <h2>Registered Users</h2>
                  <p>Manage users and their Telegram connections</p>
                </div>

                <button
                  className="refresh-btn"
                  onClick={loadUsers}
                  disabled={usersLoading}
                >
                  ↻ {usersLoading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {userError && (
                <div className="error-message">{userError}</div>
              )}

              {userSuccess && (
                <div className="success-message">{userSuccess}</div>
              )}

              {/* ADD USER FORM */}
              {showUserForm && (
                <div className="user-form-panel">
                  <div className="modal-header">
                    <div>
                      <h2>Add New User</h2>
                      <p>Enter the user's name and WhatsApp number.</p>
                    </div>

                    <button
                      type="button"
                      className="close-btn"
                      onClick={closeUserForm}
                      disabled={userSaving}
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={saveUser}>
                    <label htmlFor="userName">Full Name</label>

                    <input
                      id="userName"
                      name="name"
                      type="text"
                      required
                      maxLength="255"
                      placeholder="Enter user's name"
                      value={userForm.name}
                      onChange={handleUserChange}
                    />

                    <label htmlFor="whatsappNumber">
                      WhatsApp Number
                    </label>

                    <input
                      id="whatsappNumber"
                      name="whatsappNumber"
                      type="tel"
                      required
                      maxLength="20"
                      placeholder="Example: +919876543210"
                      value={userForm.whatsappNumber}
                      onChange={handleUserChange}
                    />

                    <div className="form-actions">
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={closeUserForm}
                        disabled={userSaving}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={userSaving}
                      >
                        {userSaving ? "Saving..." : "Save User"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* USERS TABLE */}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>USER ID</th>
                      <th>NAME</th>
                      <th>WHATSAPP NUMBER</th>
                      <th>TELEGRAM</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usersLoading ? (
                      <tr>
                        <td colSpan="5" className="empty">
                          Loading users...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty">
                          No users registered yet. Add your first user.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.id}</td>

                          <td className="contract-name">{user.name}</td>

                          <td>{user.whatsappNumber}</td>

                          <td>
                            {user.telegramChatId ? (
                              <span className="status active">
                                Connected
                              </span>
                            ) : telegramLinks[user.id] ? (
                              <a
                                href={telegramLinks[user.id]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="edit-btn"
                                style={{
                                  display: "inline-block",
                                  textDecoration: "none",
                                }}
                              >
                                Open Telegram
                              </a>
                            ) : (
                              <button
                                className="edit-btn"
                                onClick={() => connectTelegram(user.id)}
                                disabled={telegramLoadingId === user.id}
                              >
                                {telegramLoadingId === user.id
                                  ? "Generating..."
                                  : "Connect Telegram"}
                              </button>
                            )}
                          </td>

                          <td>
                            <button
                              className="delete-btn"
                              onClick={() => deleteUser(user.id)}
                              disabled={userDeletingId === user.id}
                            >
                              {userDeletingId === user.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ADD / EDIT CONTRACT MODAL */}
        {showForm && (
          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeForm();
            }}
          >
            <div className="modal">
              <div className="modal-header">
                <div>
                  <h2>
                    {editingId !== null
                      ? "Edit Contract"
                      : "Add New Contract"}
                  </h2>

                  <p>
                    {editingId !== null
                      ? "Update the contract information"
                      : "Enter the contract information"}
                  </p>
                </div>

                <button
                  type="button"
                  className="close-btn"
                  onClick={closeForm}
                  disabled={saving}
                  aria-label="Close form"
                >
                  ×
                </button>
              </div>

              <form onSubmit={saveContract}>
                <label htmlFor="contractName">Contract Name</label>

                <input
                  id="contractName"
                  name="contractName"
                  type="text"
                  required
                  maxLength="150"
                  placeholder="Enter contract name"
                  value={form.contractName}
                  onChange={handleFormChange}
                />

                <label htmlFor="partyName">Party Name</label>

                <input
                  id="partyName"
                  name="partyName"
                  type="text"
                  required
                  maxLength="150"
                  placeholder="Enter party name"
                  value={form.partyName}
                  onChange={handleFormChange}
                />

                <label htmlFor="description">Description</label>

                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  placeholder="Enter contract description"
                  value={form.description}
                  onChange={handleFormChange}
                />

                <div className="date-grid">
                  <div>
                    <label htmlFor="startDate">Start Date</label>

                    <input
                      id="startDate"
                      name="startDate"
                      type="date"
                      required
                      value={form.startDate}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="endDate">End Date</label>

                    <input
                      id="endDate"
                      name="endDate"
                      type="date"
                      required
                      value={form.endDate}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingId !== null
                      ? "Update Contract"
                      : "Save Contract"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Responsive layout overrides */}
        <style>{`
          * {
            box-sizing: border-box;
          }

          @media (max-width: 900px) {
            .app {
              width: 100%;
              min-height: 100vh;
              overflow-x: hidden;
            }

            .main {
              width: 100%;
              min-width: 0;
              margin-left: 0 !important;
              padding: 22px !important;
            }

            .topbar {
              flex-wrap: wrap;
              gap: 14px;
            }

            .topbar > div {
              min-width: 0;
            }

            .dashboard-overview {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .dashboard-alerts-column {
              grid-template-rows: auto auto !important;
            }

            .contracts-section,
            .welcome-banner {
              min-width: 0;
              width: 100%;
            }
          }

          @media (max-width: 768px) {
            .app {
              display: flex !important;
              flex-direction: column !important;
            }

            .sidebar {
              position: relative !important;
              top: auto !important;
              left: auto !important;
              width: 100% !important;
              min-width: 0 !important;
              height: auto !important;
              min-height: 0 !important;
              padding: 14px 16px !important;
              display: flex !important;
              flex-direction: row !important;
              flex-wrap: wrap !important;
              align-items: center !important;
              gap: 10px !important;
              overflow: visible !important;
              z-index: 5;
            }

            .brand {
              width: 100%;
              margin: 0 0 4px !important;
            }

            .menu-title {
              display: none !important;
            }

            .nav-item,
            .nav-button {
              display: inline-flex !important;
              flex: 1 1 auto;
              justify-content: center;
              align-items: center;
              width: auto !important;
              min-width: max-content;
              margin: 0 !important;
              padding: 10px 12px !important;
              white-space: nowrap;
              font-size: 13px !important;
            }

            .main {
              width: 100% !important;
              min-width: 0 !important;
              margin: 0 !important;
              padding: 18px 14px 28px !important;
            }

            .topbar h1 {
              font-size: 25px !important;
              line-height: 1.2;
            }

            .topbar p {
              font-size: 13px !important;
            }

            .primary-btn,
            .refresh-btn {
              min-height: 42px;
              max-width: 100%;
            }

            .dashboard-stats-grid,
            .stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              grid-template-rows: auto !important;
              gap: 10px !important;
            }

            .stat-card {
              min-width: 0;
              padding: 14px !important;
            }

            .stat-card p {
              overflow-wrap: anywhere;
              font-size: 12px !important;
            }

            .stat-card h2 {
              font-size: 24px !important;
            }

            .expired-contracts-panel,
            .expiry-alert-panel {
              padding: 14px !important;
            }

            .section-header {
              flex-wrap: wrap;
              gap: 12px;
            }

            .contract-filters {
              display: flex !important;
              flex-direction: column !important;
              align-items: stretch !important;
              width: 100%;
              gap: 12px !important;
            }

            .search-box,
            .status-filter {
              width: 100% !important;
              max-width: none !important;
              flex: 1 1 auto !important;
            }

            .table-container {
              display: block;
              width: 100%;
              max-width: 100%;
              overflow-x: auto !important;
              overflow-y: hidden;
              -webkit-overflow-scrolling: touch;
              border-radius: 10px;
            }

            .table-container table {
              min-width: 760px;
              width: max-content;
            }

            .table-container th,
            .table-container td {
              white-space: nowrap;
              padding: 11px 12px !important;
            }

            .action-buttons {
              display: flex;
              gap: 6px;
              flex-wrap: nowrap;
            }

            .welcome-banner {
              gap: 12px;
              padding: 16px !important;
            }

            .banner-symbol {
              flex: 0 0 auto;
            }

            .user-form-panel {
              width: 100%;
              padding: 16px !important;
            }

            .modal-overlay {
              padding: 12px !important;
              align-items: center !important;
              overflow-y: auto;
            }

            .modal {
              width: 100% !important;
              max-width: 520px !important;
              max-height: calc(100dvh - 24px);
              overflow-y: auto;
              margin: auto;
              padding: 18px !important;
            }

            .date-grid {
              grid-template-columns: minmax(0, 1fr) !important;
              gap: 12px !important;
            }

            .modal form input,
            .modal form textarea,
            .user-form-panel form input {
              width: 100%;
              max-width: 100%;
              font-size: 16px !important;
            }

            .form-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }

            .form-actions button {
              flex: 1 1 130px;
              min-height: 42px;
            }
          }

          @media (max-width: 480px) {
            .sidebar {
              padding: 12px !important;
              gap: 7px !important;
            }

            .brand {
              margin-bottom: 5px !important;
            }

            .nav-item,
            .nav-button {
              flex: 1 1 calc(50% - 7px);
              min-width: 0;
              padding: 10px 7px !important;
              font-size: 12px !important;
            }

            .main {
              padding: 15px 11px 24px !important;
            }

            .topbar {
              align-items: flex-start;
            }

            .topbar .primary-btn {
              width: 100%;
            }

            .dashboard-stats-grid,
            .stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .stat-card {
              padding: 12px !important;
            }

            .stat-icon {
              width: 34px;
              height: 34px;
            }

            .expired-contracts-panel,
            .expiry-alert-panel {
              padding: 12px !important;
            }

            .expired-contracts-panel h2,
            .expiry-alert-panel h2 {
              font-size: 16px !important;
            }

            .section-header h2 {
              font-size: 18px !important;
            }

            .section-header > button {
              width: 100%;
            }

            .modal-overlay {
              padding: 8px !important;
            }

            .modal {
              max-height: calc(100dvh - 16px);
              padding: 15px !important;
            }

            .modal-header {
              gap: 10px;
            }

            .modal-header h2 {
              font-size: 19px !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}

export default App;