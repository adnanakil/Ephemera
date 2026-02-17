//
//  Event.swift
//  Ephemera
//
//  Created by Adnan Akil on 11/1/25.
//

import Foundation

struct Event: Identifiable, Codable {
    let id = UUID()
    let title: String
    let description: String
    let time: String?
    let date: String?
    let location: String?
    let borough: String?
    let neighborhood: String?
    let lat: Double?
    let lng: Double?
    let link: String?
    let ticketLink: String?

    enum CodingKeys: String, CodingKey {
        case title, description, time, date, location, borough, neighborhood, lat, lng, link, ticketLink
    }

    // Regular initializer for manual creation (used in previews/tests)
    init(title: String, description: String, time: String? = nil, date: String? = nil, location: String? = nil, borough: String? = nil, neighborhood: String? = nil, lat: Double? = nil, lng: Double? = nil, link: String? = nil, ticketLink: String? = nil) {
        self.title = title
        self.description = description
        self.time = time
        self.date = date
        self.location = location
        self.borough = borough
        self.neighborhood = neighborhood
        self.lat = lat
        self.lng = lng
        self.link = link
        self.ticketLink = ticketLink
    }

    // Custom initializer to handle empty strings and nulls from API
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Title is required
        title = try container.decode(String.self, forKey: .title)

        // Description can be null, use empty string as fallback
        let descString = try? container.decode(String.self, forKey: .description)
        description = descString ?? ""

        // Handle optional strings, treating empty strings as nil
        let timeString = try? container.decode(String.self, forKey: .time)
        time = timeString?.isEmpty == false ? timeString : nil

        let dateString = try? container.decode(String.self, forKey: .date)
        date = dateString?.isEmpty == false ? dateString : nil

        let locationString = try? container.decode(String.self, forKey: .location)
        location = locationString?.isEmpty == false ? locationString : nil

        borough = try? container.decode(String.self, forKey: .borough)
        neighborhood = try? container.decode(String.self, forKey: .neighborhood)
        lat = try? container.decode(Double.self, forKey: .lat)
        lng = try? container.decode(Double.self, forKey: .lng)
        link = try? container.decode(String.self, forKey: .link)
        ticketLink = try? container.decode(String.self, forKey: .ticketLink)
    }
}

struct EventsResponse: Codable {
    let success: Bool?
    let count: Int?
    let events: [Event]
    let lastFetched: String?
}
