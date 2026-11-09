import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "https://contract-final.onrender.com/api/contracts";

const EMPTY_FORM = {
  contractName: "",
  partyName: "",
  description: "",
  startDate: "",
  endDate: "",
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

  // Avoid timezone shifts for API date strings such as YYYY-MM-DD.
  const parts = String(date).slice(0, 10).split("-");
  if (parts.length !== 3) return date;

  const [year, month, day] = parts;
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
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

  const getStatus = (contract) => {
    const today = getTodayLocal();
    const start = contract.startDate
      ? String(contract.startDate).slice(0, 10)
      : "";
    const end = contract.endDate
      ? String(contract.endDate).slice(0, 10)
      : "";

    if (start && start > today) return "UPCOMING";
    if (end && end < today) return "EXPIRED";
    return "ACTIVE";
  };

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

    if (form.endDate < form.startDate) {
      setError("End date cannot be before start date.");
      return;
    }

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
          `Unable to ${editingId !== null ? "update" : "add"} the contract. Please try again.`
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

        <div className="nav-item active">
          <span>▦</span> Dashboard
        </div>

        <button className="nav-item nav-button" onClick={openAddForm}>
          <span>＋</span> Add Contract
        </button>

        <div className="sidebar-footer">
          <span className="online-dot" />
          Backend Integration
          <strong>Spring Boot API</strong>
        </div>
      </aside>

      <main className="main">
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
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty">
                      Loading contracts...
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty">
                      {search
                        ? "No contracts match your search."
                        : "No contracts found. Add your first contract."}
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => {
                    const status = getStatus(contract);

                    return (
                      <tr key={contract.id}>
                        <td className="contract-name">
                          {contract.contractName || "—"}
                        </td>
                        <td>{contract.partyName || "—"}</td>
                        <td>{formatDate(contract.startDate)}</td>
                        <td>{formatDate(contract.endDate)}</td>
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
                  <h2>{editingId !== null ? "Edit Contract" : "Add New Contract"}</h2>
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
                      min={form.startDate || undefined}
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