//
//  EventsViewModel.swift
//  Ephemera
//
//  Created by Adnan Akil on 11/1/25.
//

import Foundation
import Combine

enum TimeFilter {
    case today
    case tomorrow
    case thisWeek
}

@MainActor
class EventsViewModel: ObservableObject {
    @Published var events: [Event] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var lastFetched: String?

    // Filter state
    @Published var selectedBorough: String = "All"
    @Published var neighborhoodSearch: String = ""
    @Published var timeFilter: TimeFilter = .today

    let boroughs = ["All", "Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"]

    var filteredEvents: [Event] {
        events.filter { event in
            let boroughMatch = selectedBorough == "All" || event.borough == selectedBorough
            let neighborhoodMatch = neighborhoodSearch.isEmpty ||
                event.neighborhood?.localizedCaseInsensitiveContains(neighborhoodSearch) == true ||
                event.location?.localizedCaseInsensitiveContains(neighborhoodSearch) == true
            let timeMatch = matchesTimeFilter(event: event)

            return boroughMatch && neighborhoodMatch && timeMatch
        }
    }

    var eventsWithCoordinates: [Event] {
        filteredEvents.filter { $0.lat != nil && $0.lng != nil }
    }

    // Parse a YYYY-MM-DD date string into a Date
    private func parseDateField(_ dateStr: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "America/New_York")
        return formatter.date(from: dateStr)
    }

    // Get today's date string in YYYY-MM-DD format (Eastern Time)
    private func todayISO() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "America/New_York")
        return formatter.string(from: Date())
    }

    // Fallback: infer date from time string for events without a date field
    private func inferDateFromTime(_ timeString: String) -> Date? {
        let months: [String: Int] = [
            "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
            "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
        ]

        let lowercased = timeString.lowercased()
        var month: Int?
        var day: Int?

        for (name, num) in months {
            if lowercased.contains(name) {
                month = num
                if let range = lowercased.range(of: name) {
                    let after = String(lowercased[range.upperBound...])
                    if let match = after.firstMatch(of: /\d+/) {
                        day = Int(match.0)
                    }
                }
                break
            }
        }

        guard let m = month, let d = day else { return nil }

        var components = DateComponents()
        components.year = Calendar.current.component(.year, from: Date())
        components.month = m
        components.day = d

        return Calendar.current.date(from: components)
    }

    private func matchesTimeFilter(event: Event) -> Bool {
        // Prefer structured date field, fall back to parsing time string
        let eventDate: Date?
        if let dateStr = event.date {
            eventDate = parseDateField(dateStr)
        } else if let timeStr = event.time {
            eventDate = inferDateFromTime(timeStr)
        } else {
            return false
        }
        guard let eventDate else { return false }

        let calendar = Calendar.current

        switch timeFilter {
        case .today:
            return calendar.isDateInToday(eventDate)
        case .tomorrow:
            return calendar.isDateInTomorrow(eventDate)
        case .thisWeek:
            let now = Date()
            guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)),
                  let weekEnd = calendar.date(byAdding: .day, value: 7, to: weekStart) else {
                return false
            }
            return eventDate >= weekStart && eventDate < weekEnd
        }
    }

    func loadEvents() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await APIService.shared.fetchEvents()
            self.events = response.events
            if let lastFetchedString = response.lastFetched {
                self.lastFetched = formatDate(lastFetchedString)
            } else {
                self.lastFetched = nil
            }
        } catch {
            self.errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func clearFilters() {
        selectedBorough = "All"
        neighborhoodSearch = ""
    }

    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoString) else {
            return isoString
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}
