import {
  syncPointsFromGoogleSheet,
  checkoutPayment,
  viewPaymentHistory
} from "../../controllers/payment.controller.js";
import axios from "axios";
import User from "../../models/user.model.js";
import TransactionLog from "../../models/transactionLog.model.js";
import { GOOGLE_SCRIPT_VIETQR_URL } from "../../config/env.js";

jest.mock("axios");
jest.mock("../../models/user.model.js");
jest.mock("../../models/transactionLog.model.js");
jest.mock("../../config/env.js", () => ({
  GOOGLE_SCRIPT_VIETQR_URL: "https://mock-google-script.com/vietqr",
  EMAIL_ACCOUNT: "test@example.com"
}));
jest.mock("../../config/nodemailer.js");

describe("Payment Controller", () => {
  let req, res, next;
  let consoleSpy;

  beforeEach(() => {
    req = { 
      body: {}, 
      params: {}, 
      query: {},
      user: { _id: "user123" }
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    
    // Reset all mocks completely
    jest.clearAllMocks();
    
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
    
    // Ensure model methods are properly mocked
    User.findById = jest.fn();
    TransactionLog.findOne = jest.fn();
    TransactionLog.create = jest.fn();
    axios.get = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("syncPointsFromGoogleSheet", () => {
    it("should sync points successfully with valid transactions", async () => {
      const mockTransactions = [
        {
          "Mã GD": "TX001",
          "Mô tả": "Nap 100 diem W4U",
          "Giá trị": 100000
        },
        {
          "Mã GD": "TX002", 
          "Mô tả": "Nap 50 diem W4U",
          "Giá trị": 50000
        }
      ];

      const mockUser = {
        _id: "user123",
        points: 0,
        save: jest.fn().mockResolvedValue()
      };

      axios.get.mockResolvedValue({
        data: { data: mockTransactions }
      });

      TransactionLog.findOne = jest.fn()
        .mockResolvedValueOnce(null) // TX001 not exists
        .mockResolvedValueOnce(null); // TX002 not exists

      User.findById = jest.fn().mockResolvedValue(mockUser);
      TransactionLog.create = jest.fn().mockResolvedValue({});

      await syncPointsFromGoogleSheet(req, res);

      expect(axios.get).toHaveBeenCalledWith(GOOGLE_SCRIPT_VIETQR_URL);
      expect(TransactionLog.findOne).toHaveBeenCalledWith({ transactionId: "TX001" });
      expect(TransactionLog.findOne).toHaveBeenCalledWith({ transactionId: "TX002" });
      expect(User.findById).toHaveBeenCalledTimes(2);
      expect(mockUser.save).toHaveBeenCalledTimes(2);
      expect(TransactionLog.create).toHaveBeenCalledTimes(2);

      expect(res.json).toHaveBeenCalledWith({
        message: "Đồng bộ giao dịch VietQR thành công"
      });
    });

    it("should return 401 when userId is missing", async () => {
      req.user = {}; // No _id

      await syncPointsFromGoogleSheet(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unauthorized, userId missing"
      });
      expect(axios.get).not.toHaveBeenCalled();
    });

    it("should return 400 when no transactions available", async () => {
      axios.get.mockResolvedValue({
        data: { data: null }
      });

      await syncPointsFromGoogleSheet(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Không có giao dịch"
      });
    });

    it("should return 400 when transactions is not an array", async () => {
      axios.get.mockResolvedValue({
        data: { data: "invalid data" }
      });

      await syncPointsFromGoogleSheet(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Không có giao dịch"
      });
    });

    it("should skip already processed transactions", async () => {
      const mockTransactions = [
        {
          "Mã GD": "TX001",
          "Mô tả": "Nap 100 diem W4U",
          "Giá trị": 100000
        },
        {
          "Mã GD": "TX002",
          "Mô tả": "Nap 50 diem W4U", 
          "Giá trị": 50000
        }
      ];

      axios.get.mockResolvedValue({
        data: { data: mockTransactions }
      });

      // TX001 already exists, TX002 is new
      TransactionLog.findOne = jest.fn()
        .mockResolvedValueOnce({ transactionId: "TX001" }) // Already exists
        .mockResolvedValueOnce(null); // New transaction

      const mockUser = {
        _id: "user123",
        points: 0,
        save: jest.fn().mockResolvedValue()
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      TransactionLog.create = jest.fn().mockResolvedValue({});

      await syncPointsFromGoogleSheet(req, res);

      // Should only process TX002
      expect(User.findById).toHaveBeenCalledTimes(1);
      expect(mockUser.save).toHaveBeenCalledTimes(1);
      expect(TransactionLog.create).toHaveBeenCalledTimes(1);
      
      expect(res.json).toHaveBeenCalledWith({
        message: "Đồng bộ giao dịch VietQR thành công"
      });
    });

    it("should skip transactions with invalid description format", async () => {
      const mockTransactions = [
        {
          "Mã GD": "TX001",
          "Mô tả": "Transfer money", // Invalid format
          "Giá trị": 100000
        },
        {
          "Mã GD": "TX002",
          "Mô tả": "Nap 50 diem W4U", // Valid format
          "Giá trị": 50000
        }
      ];

      axios.get.mockResolvedValue({
        data: { data: mockTransactions }
      });

      TransactionLog.findOne = jest.fn().mockResolvedValue(null);

      const mockUser = {
        _id: "user123",
        points: 0,
        save: jest.fn().mockResolvedValue()
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      TransactionLog.create = jest.fn().mockResolvedValue({});

      await syncPointsFromGoogleSheet(req, res);

      // Should only process TX002 (valid format)
      expect(User.findById).toHaveBeenCalledTimes(1);
      expect(mockUser.save).toHaveBeenCalledTimes(1);
      expect(TransactionLog.create).toHaveBeenCalledTimes(1);
    });

    it("should skip transactions when user not found", async () => {
      const mockTransactions = [
        {
          "Mã GD": "TX001",
          "Mô tả": "Nap 100 diem W4U",
          "Giá trị": 100000
        }
      ];

      axios.get.mockResolvedValue({
        data: { data: mockTransactions }
      });

      TransactionLog.findOne = jest.fn().mockResolvedValue(null);
      User.findById = jest.fn().mockResolvedValue(null); // User not found

      await syncPointsFromGoogleSheet(req, res);

      expect(TransactionLog.create).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Đồng bộ giao dịch VietQR thành công"
      });
    });

    it("should handle axios errors", async () => {
      const error = new Error("Network error");
      axios.get.mockRejectedValue(error);

      await syncPointsFromGoogleSheet(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Lỗi hệ thống"
      });
      expect(consoleSpy.error).toHaveBeenCalledWith("❌ Lỗi đồng bộ VietQR:", error.message);
    });

    it("should handle database errors during user save", async () => {
      const mockTransactions = [
        {
          "Mã GD": "TX001",
          "Mô tả": "Nap 100 diem W4U",
          "Giá trị": 100000
        }
      ];

      const saveError = new Error("Database save error");
      const mockUser = {
        _id: "user123",
        points: 0,
        save: jest.fn().mockRejectedValue(saveError)
      };

      axios.get.mockResolvedValue({
        data: { data: mockTransactions }
      });

      TransactionLog.findOne = jest.fn().mockResolvedValue(null);
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await syncPointsFromGoogleSheet(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Lỗi hệ thống"
      });
    });

    it("should handle TransactionLog.create errors", async () => {
      const mockTransactions = [
        {
          "Mã GD": "TX001",
          "Mô tả": "Nap 100 diem W4U",
          "Giá trị": 100000
        }
      ];

      const mockUser = {
        _id: "user123",
        points: 0,
        save: jest.fn().mockResolvedValue()
      };

      const createError = new Error("TransactionLog create error");

      axios.get.mockResolvedValue({
        data: { data: mockTransactions }
      });

      TransactionLog.findOne = jest.fn().mockResolvedValue(null);
      User.findById = jest.fn().mockResolvedValue(mockUser);
      TransactionLog.create = jest.fn().mockRejectedValue(createError);

      await syncPointsFromGoogleSheet(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Lỗi hệ thống"
      });
    });

    it("should correctly parse points from description with various formats", async () => {
      const mockTransactions = [
        {
          "Mã GD": "TX001",
          "Mô tả": "Nap 100 diem W4U",
          "Giá trị": 100000
        },
        {
          "Mã GD": "TX002",
          "Mô tả": "NAP 250 DIEM W4U", // Uppercase
          "Giá trị": 250000
        },
        {
          "Mã GD": "TX003",
          "Mô tả": "nap    75    diem    w4u", // Extra spaces
          "Giá trị": 75000
        }
      ];

      const mockUser = {
        _id: "user123",
        points: 0,
        save: jest.fn().mockResolvedValue()
      };

      axios.get.mockResolvedValue({
        data: { data: mockTransactions }
      });

      TransactionLog.findOne = jest.fn().mockResolvedValue(null);
      User.findById = jest.fn().mockResolvedValue(mockUser);
      TransactionLog.create = jest.fn().mockResolvedValue({});

      await syncPointsFromGoogleSheet(req, res);

      // Verify points were added correctly
      expect(mockUser.points).toBe(425); // 100 + 250 + 75
      expect(mockUser.save).toHaveBeenCalledTimes(3);
    });

    it("should handle empty transactions array", async () => {
      axios.get.mockResolvedValue({
        data: { data: [] }
      });

      await syncPointsFromGoogleSheet(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: "Đồng bộ giao dịch VietQR thành công"
      });
      expect(User.findById).not.toHaveBeenCalled();
      expect(TransactionLog.create).not.toHaveBeenCalled();
    });
  });

  describe("checkoutPayment", () => {
    it("should handle function call (placeholder implementation)", () => {
      checkoutPayment(req, res, next);
      
      // Since the function is empty, we just verify it doesn't throw
      expect(true).toBe(true);
    });

    it("should be a function", () => {
      expect(typeof checkoutPayment).toBe('function');
    });
  });

  describe("viewPaymentHistory", () => {
    it("should handle function call (placeholder implementation)", () => {
      viewPaymentHistory(req, res, next);
      
      // Since the function is empty, we just verify it doesn't throw
      expect(true).toBe(true);
    });

    it("should be a function", () => {
      expect(typeof viewPaymentHistory).toBe('function');
    });
  });
});
