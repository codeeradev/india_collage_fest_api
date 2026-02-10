const City = require("../../models/city");
const message = require("../../constants/messages.json");
const fs = require("fs");

const type = "City";

const parseCsv = (content) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (char === "\r") {
        if (content[i + 1] === "\n") {
          i += 1;
        }
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((value) => value.trim() !== ""));
};

const normalizeHeader = (value) =>
  value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const getValueByHeader = (headers, row, keys) => {
  for (const key of keys) {
    const idx = headers.indexOf(key);
    if (idx !== -1) {
      return row[idx] ?? "";
    }
  }
  return "";
};

const parseBoolean = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "1", "yes", "y", "active"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "inactive"].includes(normalized)) return false;
  return null;
};

// ADD CITY
exports.addCity = async (req, res) => {
  try {
    const { city, latitude, longitude, description, is_active, popular } = req.body;

    const image = `/assets/uploads/${req.files.image[0].filename}`
    const exists = await City.findOne({ city });
    if (exists) {
      return res.status(400).json({ message: "City already exists" });
    }

    const newCity = await City.create({
      city,
      latitude,
      longitude,
      description,
      image,
      popular,
      is_active: is_active ?? true,
    });

    return res.status(200).json({
      message: message.success.replace("{value}", type),
      data: newCity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

// ADD CITY VIA CSV
exports.addCityCsv = async (req, res) => {
  const csvFile = req.files?.csv?.[0];
  if (!csvFile) {
    return res.status(400).json({ message: "CSV file is required" });
  }

  let csvContent = "";
  try {
    csvContent = fs.readFileSync(csvFile.path, "utf8");
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Unable to read CSV file" });
  }

  try {
    const rows = parseCsv(csvContent);
    if (rows.length < 2) {
      return res.status(400).json({ message: "CSV file has no data rows" });
    }

    const headers = rows[0].map(normalizeHeader);
    if (!headers.includes("city") && !headers.includes("name")) {
      return res.status(400).json({ message: "CSV must include a city/name column" });
    }

    const dataRows = rows.slice(1);
    const uniqueMap = new Map();
    let invalidRows = 0;
    let duplicateInFile = 0;

    for (const row of dataRows) {
      const city = String(
        getValueByHeader(headers, row, ["city", "name", "city_name"])
      ).trim();

      if (!city) {
        invalidRows += 1;
        continue;
      }

      if (uniqueMap.has(city)) {
        duplicateInFile += 1;
        continue;
      }

      const latitude = String(
        getValueByHeader(headers, row, ["latitude", "lat"])
      ).trim();
      const longitude = String(
        getValueByHeader(headers, row, ["longitude", "long", "lng"])
      ).trim();
      const description = String(
        getValueByHeader(headers, row, ["description", "desc", "about"])
      ).trim();
      const isActiveRaw = getValueByHeader(headers, row, [
        "is_active",
        "active_status",
        "active",
        "status",
        "isactive",
      ]);

      const isActive = parseBoolean(isActiveRaw);

      const payload = {
        city,
        is_active: isActive ?? true,
      };
      if (latitude) payload.latitude = latitude;
      if (longitude) payload.longitude = longitude;
      if (description) payload.description = description;

      uniqueMap.set(city, payload);
    }

    if (uniqueMap.size === 0) {
      return res.status(400).json({ message: "No valid rows found in CSV" });
    }

    const cityNames = Array.from(uniqueMap.keys());
    const existing = await City.find({ city: { $in: cityNames } })
      .select("city")
      .lean();
    const existingSet = new Set(existing.map((item) => item.city));

    const toInsert = [];
    for (const [name, payload] of uniqueMap.entries()) {
      if (!existingSet.has(name)) {
        toInsert.push(payload);
      }
    }

    let created = [];
    if (toInsert.length > 0) {
      created = await City.insertMany(toInsert, { ordered: false });
    }

    return res.status(200).json({
      message: "CSV processed successfully",
      data: {
        createdCount: created.length,
        skippedExisting: existingSet.size,
        skippedInvalid: invalidRows,
        skippedDuplicateInFile: duplicateInFile,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  } finally {
    try {
      fs.unlinkSync(csvFile.path);
    } catch (error) {
      // ignore cleanup errors
    }
  }
};

// GET ALL CITIES
exports.getCity = async (req, res) => {
  try {
    const cities = await City.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: message.fetchSuccess.replace("{value}", type),
      data: cities,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};

exports.editCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    const { city, latitude, longitude, description, is_active, popular } = req.body;

    const updateData = {};

    if (city !== undefined) updateData.city = city;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (req.files?.image) {
      updateData.image = `/assets/uploads/${req.files.image[0].filename}`;
    }
    if (popular !== undefined) updateData.popular = popular;
      
    const updatedCity = await City.findByIdAndUpdate(
      cityId,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      message: "City updated successfully",
      data: updatedCity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: message.server_error });
  }
};
