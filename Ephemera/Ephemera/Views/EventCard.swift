//
//  EventCard.swift
//  Ephemera
//
//  Created by Adnan Akil on 11/1/25.
//

import SwiftUI

struct EventCard: View {
    let event: Event

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Date and time
            if let dateStr = event.date, let displayDate = formatDateField(dateStr) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(displayDate)
                        .font(.title)
                        .fontWeight(.light)
                        .foregroundColor(Color(hex: "3D3426"))

                    if let eventTime = event.time, let timeOnly = extractTimePortion(eventTime), !timeOnly.isEmpty {
                        Text(timeOnly)
                            .font(.subheadline)
                            .fontWeight(.light)
                            .foregroundColor(Color(hex: "6B5D4F"))
                    }
                }
            } else if let eventTime = event.time, !eventTime.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    if let (date, dayTime) = parseTime(eventTime) {
                        Text(date)
                            .font(.title)
                            .fontWeight(.light)
                            .foregroundColor(Color(hex: "3D3426"))

                        if !dayTime.isEmpty {
                            Text(dayTime)
                                .font(.subheadline)
                                .fontWeight(.light)
                                .foregroundColor(Color(hex: "6B5D4F"))
                        }
                    } else {
                        Text(eventTime)
                            .font(.title)
                            .fontWeight(.light)
                            .foregroundColor(Color(hex: "3D3426"))
                    }
                }
            }

            // Title
            Text(event.title)
                .font(.title3)
                .fontWeight(.light)
                .foregroundColor(Color(hex: "3D3426"))
                .lineLimit(2)

            // Description
            Text(event.description)
                .font(.subheadline)
                .fontWeight(.light)
                .foregroundColor(Color(hex: "6B5D4F"))
                .lineLimit(3)

            VStack(alignment: .leading, spacing: 12) {
                // Location
                if let eventLocation = event.location, !eventLocation.isEmpty {
                    HStack(alignment: .top, spacing: 8) {
                        Text("Location:")
                            .fontWeight(.light)
                            .foregroundColor(Color(hex: "8B7D6F"))
                        Text(eventLocation)
                            .fontWeight(.light)
                            .foregroundColor(Color(hex: "3D3426"))
                    }
                    .font(.caption)
                }

                // Tags
                if event.borough != nil || event.neighborhood != nil {
                    HStack(spacing: 8) {
                        if let borough = event.borough {
                            Text(borough)
                                .font(.caption2)
                                .fontWeight(.light)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 4)
                                .background(Color(hex: "E8DED0"))
                                .foregroundColor(Color(hex: "6B5D4F"))
                                .clipShape(Capsule())
                        }

                        if let neighborhood = event.neighborhood {
                            Text(neighborhood)
                                .font(.caption2)
                                .fontWeight(.light)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 4)
                                .background(Color(hex: "E8F5E9"))
                                .foregroundColor(Color(hex: "6B5D4F"))
                                .clipShape(Capsule())
                        }
                    }
                }

                // Links
                HStack(spacing: 16) {
                    if let link = event.link, let url = URL(string: link) {
                        Link("Details →", destination: url)
                            .font(.caption)
                            .fontWeight(.light)
                            .foregroundColor(Color(hex: "3D3426"))
                    }

                    if let ticketLink = event.ticketLink, let url = URL(string: ticketLink) {
                        Link("Tickets →", destination: url)
                            .font(.caption)
                            .fontWeight(.light)
                            .foregroundColor(Color(hex: "3D3426"))
                    }
                }
                .padding(.top, 8)
            }
        }
        .padding(20)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color(hex: "E0D5C7"), lineWidth: 1)
        )
    }

    // Format a YYYY-MM-DD string to display like "February 15"
    private func formatDateField(_ dateStr: String) -> String? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateStr) else { return nil }
        let display = DateFormatter()
        display.dateFormat = "MMMM d"
        return display.string(from: date)
    }

    // Extract time portion from a time string (e.g., "7:00 PM" or "7:00 PM - 10:00 PM")
    private func extractTimePortion(_ timeString: String) -> String? {
        let pattern = "\\d{1,2}:\\d{2}\\s*(?:AM|PM|am|pm)(?:\\s*-\\s*\\d{1,2}:\\d{2}\\s*(?:AM|PM|am|pm))?"
        if let regex = try? NSRegularExpression(pattern: pattern, options: []),
           let match = regex.firstMatch(in: timeString, range: NSRange(timeString.startIndex..., in: timeString)),
           let range = Range(match.range, in: timeString) {
            return String(timeString[range])
        }
        return nil
    }

    private func parseTime(_ timeString: String) -> (date: String, dayTime: String)? {
        // Try to extract date pattern
        let pattern = "(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2}(?:\\s*-\\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\\s*\\d{1,2})?"

        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: timeString, range: NSRange(timeString.startIndex..., in: timeString)),
           let range = Range(match.range, in: timeString) {
            let date = String(timeString[range])
            let dayTime = timeString.replacingOccurrences(of: date, with: "")
                .trimmingCharacters(in: CharacterSet(charactersIn: ", "))
            return (date, dayTime)
        }

        return nil
    }
}

// Helper extension for hex colors
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    EventCard(event: Event(
        title: "Sample Event",
        description: "This is a sample event description that shows how the card will look.",
        time: "October 30, Thursday, 7:00 PM",
        date: "2026-10-30",
        location: "Central Park, Manhattan",
        borough: "Manhattan",
        neighborhood: "Central Park",
        lat: 40.7829,
        lng: -73.9654,
        link: "https://example.com",
        ticketLink: nil
    ))
    .padding()
    .background(Color(hex: "F5F1E8"))
}
