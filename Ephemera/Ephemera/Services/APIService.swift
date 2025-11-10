//
//  APIService.swift
//  Ephemera
//
//  Created by Adnan Akil on 11/1/25.
//

import Foundation

class APIService {
    static let shared = APIService()

    // Update this to your production URL
    private let baseURL = "https://ephemera-nyc-0c9477e4fde1.herokuapp.com"

    private init() {}

    // Fetch events from cache (GET /api/events)
    func fetchEvents() async throws -> EventsResponse {
        // Use GET endpoint that returns cached events from Redis
        // Background cron job handles scraping to avoid timeout
        guard let url = URL(string: "\(baseURL)/api/events") else {
            throw APIError.invalidURL
        }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }

        do {
            let decoder = JSONDecoder()
            let eventsResponse = try decoder.decode(EventsResponse.self, from: data)
            return eventsResponse
        } catch {
            print("Decoding error: \(error)")
            throw APIError.decodingError
        }
    }

    // Trigger background refresh job (POST /api/events/refresh)
    func triggerRefresh() async throws {
        guard let url = URL(string: "\(baseURL)/api/events/refresh") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
    }
}

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case decodingError

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .decodingError:
            return "Failed to decode response"
        }
    }
}
