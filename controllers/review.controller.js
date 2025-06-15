import Review from "../models/review.model.js";

export const reviewCandidate = async (req, res) => {
  try {
    const reviewerId = req.user._id; // lấy từ middleware authenticate
    const reviewedUserId = req.params.reviewUserId;
    const { rating, comment } = req.body;

    if (reviewerId.toString() === reviewedUserId) {
      return res.status(400).json({ message: "Không thể tự review chính mình." });
    }

    const review = await Review.create({
      reviewerId,
      reviewedUserId,
      rating,
      comment,
    });

    res.status(201).json({ message: "Review thành công.", review });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi tạo review.", error: err.message });
  }
};


export const viewUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewedUserId: userId })
      .populate("reviewerId", "name") // chỉ lấy name của người đánh giá
      .sort({ createdAt: -1 });

    const result = reviews.map(r => ({
      reviewer: r.reviewerId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Không thể lấy danh sách review.", error: err.message });
  }
};
