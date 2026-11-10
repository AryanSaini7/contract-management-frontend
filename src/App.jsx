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

  // Add user form
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

  // Contract statistics
  const filteredContracts = contracts.filter((contract) => {
    const searchText = `${contract.contractName || ""} ${
      contract.partyName || ""
    }`.toLowerCase();

    return searchText.includes(search.trim().toLowerCase());
  });

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
                <p>Welcome to your Contract Management System</p>
              </div>

              <button className="primary-btn" onClick={openAddForm}>
                + New Contract
              </button>
            </header>

            <section className="welcome-banner">
              <div>
                <h2>Manage Your Contracts Smarter</h2>
                <p>
                  Track, organize and monitor all your contracts from one place.
                </p>
              </div>
              <div className="banner-symbol">📄</div>
            </section>

            <section className="stats-grid">
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
            </section>

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

              <div className="search-box">
                <span>⌕</span>
                <input
                  type="text"
                  placeholder="Search contracts or parties..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
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
                          {search
                            ? "No contracts match your search."
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
                              <span className={`status ${status.toLowerCase()}`}>
                                {status}
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
                                  onClick={() => deleteContract(contract.id)}
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

        {/* EXISTING CONTRACT MODAL */}
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
                    {editingId !== null ? "Edit Contract" : "Add New Contract"}
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
      </main>
    </div>
  );
}

export default App;