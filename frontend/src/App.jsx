import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Landing from "./pages/Landing";
import FindParking from "./pages/FindParking";
import LotDetail from "./pages/LotDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyBookings from "./pages/MyBookings";
import AddLot from "./pages/AddLot";
import Checkout from "./pages/Checkout";
import BookingConfirmed from "./pages/BookingConfirmed";
import ManageVehicles from "./pages/ManageVehicles";
import AdminDashboard from "./pages/AdminDashboard";
import CheckIn from "./pages/CheckIn";
import ScanCheckIn from "./pages/ScanCheckIn";
import AssistantWidget from "./components/AssistantWidget";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/find" element={<FindParking />} />
          <Route path="/lots/:id" element={<LotDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/list-space"
            element={
              <ProtectedRoute>
                <AddLot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/confirmed"
            element={
              <ProtectedRoute>
                <BookingConfirmed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles"
            element={
              <ProtectedRoute>
                <ManageVehicles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/checkin/:id"
            element={
              <ProtectedRoute>
                <CheckIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <ScanCheckIn />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
      <AssistantWidget />
    </div>
  );
}
