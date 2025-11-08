//
//  MapView.swift
//  Ephemera
//
//  Created by Adnan Akil on 11/1/25.
//

import SwiftUI
import MapKit

struct MapView: View {
    let events: [Event]
    @StateObject private var locationManager = LocationManager()
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 40.7128, longitude: -73.9654),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )
    @State private var selectedEventID: UUID? = nil

    var body: some View {
        Map(coordinateRegion: $region, showsUserLocation: true, annotationItems: events) { event in
            MapAnnotation(coordinate: CLLocationCoordinate2D(
                latitude: event.lat ?? 0,
                longitude: event.lng ?? 0
            )) {
                EventMapMarker(event: event, selectedEventID: $selectedEventID)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color(hex: "E0D5C7"), lineWidth: 1)
        )
        .onAppear {
            // Center on user's location when available
            if let userLocation = locationManager.location {
                region.center = userLocation.coordinate
            }
        }
        .onChange(of: locationManager.location) { newLocation in
            // Update region when location updates
            if let location = newLocation {
                withAnimation {
                    region.center = location.coordinate
                }
            }
        }
    }
}

struct EventMapMarker: View {
    let event: Event
    @Binding var selectedEventID: UUID?

    var showPopup: Bool {
        selectedEventID == event.id
    }

    var body: some View {
        VStack(spacing: 0) {
            if showPopup {
                VStack(alignment: .leading, spacing: 12) {
                    Text(event.title)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(Color(hex: "3D3426"))
                        .lineLimit(3)

                    Text(event.description.prefix(150) + "...")
                        .font(.subheadline)
                        .foregroundColor(Color(hex: "6B5D4F"))
                        .lineLimit(4)

                    if let eventTime = event.time {
                        HStack(alignment: .top, spacing: 4) {
                            Text("Time:")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(Color(hex: "8B7D6F"))
                            Text(eventTime)
                                .font(.subheadline)
                                .foregroundColor(Color(hex: "8B7D6F"))
                                .lineLimit(2)
                        }
                    }

                    if let eventLocation = event.location {
                        HStack(alignment: .top, spacing: 4) {
                            Text("Location:")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(Color(hex: "8B7D6F"))
                            Text(eventLocation)
                                .font(.subheadline)
                                .foregroundColor(Color(hex: "8B7D6F"))
                                .lineLimit(2)
                        }
                    }

                    if let link = event.link, let url = URL(string: link) {
                        Link("Details →", destination: url)
                            .font(.subheadline)
                            .foregroundColor(Color(hex: "3D3426"))
                            .padding(.top, 4)
                    }
                }
                .padding(16)
                .frame(width: UIScreen.main.bounds.width * 0.8)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(radius: 8)
                .transition(.scale.combined(with: .opacity))
            }

            Image(systemName: "mappin.circle.fill")
                .font(.title)
                .foregroundColor(.red)
                .background(Color.white.clipShape(Circle()))
                .onTapGesture {
                    withAnimation(.spring()) {
                        // Toggle: if this event is selected, deselect it; otherwise select it (closing others)
                        if selectedEventID == event.id {
                            selectedEventID = nil
                        } else {
                            selectedEventID = event.id
                        }
                    }
                }
        }
    }
}

#Preview {
    @Previewable @State var selectedID: UUID? = nil

    MapView(events: [
        Event(
            title: "Sample Event",
            description: "This is a sample event description.",
            time: "October 30, 7:00 PM",
            location: "Central Park",
            borough: "Manhattan",
            neighborhood: "Central Park",
            lat: 40.7829,
            lng: -73.9654,
            link: nil,
            ticketLink: nil
        )
    ])
    .frame(height: 400)
    .padding()
}
