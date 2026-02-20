import React, { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

const Profile = () => {
  const [user] = useAuthState(auth);
  const [profileData, setProfileData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    balance: 0,
    paymentMethod: "",
  });

  // 🔹 State for Password Update
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // 🔹 Fetch User Data from Firestore
  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfileData(docSnap.data());
          setFormData({
            name: docSnap.data().name || "",
            phone: docSnap.data().phone || "",
            balance: docSnap.data().balance || 0,
            paymentMethod: docSnap.data().paymentMethod || "None",
          });
        }
      };
      fetchUserData();
    }
  }, [user]);

  // 🔹 Handle Input Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // 🔹 Handle Profile Update in Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, {
        name: formData.name,
        phone: formData.phone,
        balance: formData.balance,
        paymentMethod: formData.paymentMethod,
      });
      setProfileData(formData);
      setIsEditing(false);
      alert("Profile updated successfully!");
    }
  };

  // 🔹 Handle Password Change
  const handleChangePassword = async () => {
    if (!user || !currentPassword || !newPassword) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email || "", currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update Password
      await updatePassword(user, newPassword);
      alert("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      alert("Error updating password: " + error.message);
    }
  };

  // 🔹 Handle Logout
  const handleLogout = async () => {
    await signOut(auth);
    alert("Logged out successfully!");
  };

  // 🔹 Handle Adding Payment Method
  const handleAddPaymentMethod = async () => {
    if (!user) return;

    const newMethod = prompt("Enter new payment method (UPI, Credit Card, etc.):");
    if (!newMethod) return;

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      paymentMethods: arrayUnion(newMethod),
    });

    alert("Payment method added!");
    setProfileData((prev: any) => ({
      ...prev,
      paymentMethods: [...(prev.paymentMethods || []), newMethod],
    }));
  };

  // 🔹 Function to check if booking date and time have passed
  const isBookingCompleted = (booking: any) => {
    if (booking.status !== "Confirmed") return false;
    
    const now = new Date();
    const bookingDate = new Date(booking.date);
    
    // Parse time (assuming format like "10:00 AM")
    if (booking.time) {
      const [hours, minutes] = booking.time.match(/(\d+):(\d+)/).slice(1, 3).map(Number);
      const isPM = booking.time.toLowerCase().includes('pm');
      
      bookingDate.setHours(
        isPM && hours < 12 ? hours + 12 : hours,
        minutes
      );
    }
    
    return now > bookingDate;
  };

  // 🔹 Function to get display status
  const getDisplayStatus = (booking: any) => {
    if (booking.status === "Cancelled") return booking.status;
    return isBookingCompleted(booking) ? "Completed" : booking.status;
  };

  // 🔹 Function to get status style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-colors">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Your Profile</h1>

        {!isEditing ? (
          <div className="space-y-6">
            {profileData ? (
              <>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Name: {profileData.name}</h2>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Email: {user?.email}</h2>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Phone: {profileData.phone}</h2>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Balance: ₹{profileData.balance}</h2>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Method: {profileData.paymentMethod}</h2>

                {/* 🔹 Enhanced Booking History */}
                <div className="mt-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Booking History</h2>
                  {profileData.bookingHistory && profileData.bookingHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse rounded-lg overflow-hidden">
                        <thead className="bg-gray-200 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Service</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Specific Service</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Time</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Fee</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {profileData.bookingHistory.map((booking: any, index: number) => {
                            const displayStatus = getDisplayStatus(booking);
                            
                            return (
                              <tr key={index} className={index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"}>
                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{booking.service}</td>
                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{booking.specificService}</td>
                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{booking.date}</td>
                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{booking.time}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(displayStatus)}`}>
                                    {displayStatus}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">₹{booking.tokenFee}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-400">No bookings found.</p>
                    </div>
                  )}
                </div>

                {/* 🔹 Display Payment Methods */}
                <div className="mt-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Payment Methods</h2>
                  <div className="space-y-2">
                    {profileData.paymentMethods && profileData.paymentMethods.length > 0 ? (
                      profileData.paymentMethods.map((method: string, index: number) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg bg-gray-100 dark:bg-gray-900">
                          <p className="text-gray-700 dark:text-gray-300">{method}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
                        <p className="text-gray-600 dark:text-gray-400">No payment methods added.</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAddPaymentMethod}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg mt-4 font-medium transition-colors"
                  >
                    Add Payment Method
                  </button>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors mt-4"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-center items-center h-40">
                <div className="animate-pulse flex space-x-4">
                  <div className="rounded-full bg-gray-300 dark:bg-gray-700 h-12 w-12"></div>
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <div className="pt-4 flex space-x-4">
              <button 
                type="submit" 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Save Changes
              </button>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;