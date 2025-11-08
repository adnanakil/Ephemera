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

    private func matchesTimeFilter(event: Event) -> Bool {
        guard let timeString = event.time else { return true }

        // Parse the date from the time string
        let eventDate = parseEventDate(from: timeString)

        switch timeFilter {
        case .today:
            return isToday(date: eventDate, timeString: timeString)
        case .tomorrow:
            return isTomorrow(date: eventDate, timeString: timeString)
        case .thisWeek:
            return isThisWeek(date: eventDate, timeString: timeString)
        }
    }

    private func parseEventDate(from timeString: String) -> Date? {
        // Try to extract month and day
        let months = ["january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
                      "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
                      "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12]

        let lowercased = timeString.lowercased()

        // Find month
        var month: Int?
        var day: Int?

        for (monthName, monthNumber) in months {
            if lowercased.contains(monthName) {
                month = monthNumber
                // Try to find day number after month
                if let range = lowercased.range(of: monthName) {
                    let afterMonth = String(lowercased[range.upperBound...])
                    // Extract first number
                    if let dayMatch = afterMonth.firstMatch(of: /\d+/) {
                        day = Int(dayMatch.0)
                    }
                }
                break
            }
        }

        guard let m = month, let d = day else { return nil }

        // Construct date with current year
        var components = DateComponents()
        components.year = Calendar.current.component(.year, from: Date())
        components.month = m
        components.day = d

        return Calendar.current.date(from: components)
    }

    private func isToday(date: Date?, timeString: String) -> Bool {
        // If can't parse date, show "ongoing" events on all days
        if timeString.lowercased().contains("ongoing") {
            return true
        }

        guard let eventDate = date else { return false }

        return Calendar.current.isDateInToday(eventDate)
    }

    private func isTomorrow(date: Date?, timeString: String) -> Bool {
        // Always show "ongoing" events
        if timeString.lowercased().contains("ongoing") {
            return true
        }

        guard let eventDate = date else { return false }

        return Calendar.current.isDateInTomorrow(eventDate)
    }

    private func isThisWeek(date: Date?, timeString: String) -> Bool {
        // Always show "ongoing" events
        if timeString.lowercased().contains("ongoing") {
            return true
        }

        guard let eventDate = date else { return false }

        let calendar = Calendar.current
        let now = Date()

        // Get start and end of current week
        guard let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)),
              let weekEnd = calendar.date(byAdding: .day, value: 7, to: weekStart) else {
            return false
        }

        return eventDate >= weekStart && eventDate < weekEnd
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
