export const buildMongoFilters = (filterItems = []) => {
  const filters = filterItems.map((item) => {
    const { field, operator, value } = item;
    if (!field) return null;

    switch (operator) {
      case "contains":
        if (typeof value !== "string" || !value.trim()) return null;
        return { [field]: { $regex: value, $options: "i" } };

      case "doesNotContain":
        if (typeof value !== "string" || !value.trim()) return null;
        return { [field]: { $not: { $regex: value, $options: "i" } } };

      case "equals":
        return { [field]: value };

      case "doesNotEqual":
        return { [field]: { $ne: value } };

      case "startsWith":
        if (typeof value !== "string" || !value.trim()) return null;
        return { [field]: { $regex: "^" + value, $options: "i" } };

      case "endsWith":
        if (typeof value !== "string" || !value.trim()) return null;
        return { [field]: { $regex: value + "$", $options: "i" } };

      case "isEmpty":
        return {
          $or: [
            { [field]: { $exists: false } },
            { [field]: "" },
            { [field]: null },
          ],
        };

      case "isNotEmpty":
        return { [field]: { $nin: [null, ""] } };

      case "isAnyOf":
        if (Array.isArray(value) && value.length > 0) {
          return { [field]: { $in: value } };
        }
        return null;

      default:
        return null;
    }
  });

  const clean = filters.filter(Boolean);
  return clean.length > 0 ? { $and: clean } : {};
};
