import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 🔹 Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔹 Store User Data in Firestore (Now includes Phone Number)
      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: user.email,
        phone: phone, // Added phone field
        balance: 0, // Default balance
        bookingHistory: [],
        refundedAmount: 0,
        paymentMethods: [],
      });

      alert("Signup successful!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold text-center mb-4">Sign Up</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <form onSubmit={handleSignup} className="space-y-4">
        <input
          type="text"
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="tel"
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full px-4 py-2 border rounded-lg"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default Signup;
