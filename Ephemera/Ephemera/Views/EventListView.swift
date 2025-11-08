//
//  EventListView.swift
//  Ephemera
//
//  Created by Adnan Akil on 11/1/25.
//

import SwiftUI

struct EventListView: View {
    @ObservedObject var viewModel: EventsViewModel
    @State private var showingFilters = false
    @State private var viewMode: ViewMode = .map

    enum ViewMode {
        case list, map
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "F5F1E8")
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        // Header
                        Text("Ephemera")
                            .font(.system(size: 48, weight: .thin))
                            .foregroundColor(Color(hex: "3D3426"))
                            .padding(.horizontal)

                        // View Mode Toggle
                        if !viewModel.events.isEmpty {
                            HStack(spacing: 12) {
                                Button {
                                    viewMode = .list
                                } label: {
                                    Text("List View")
                                        .font(.subheadline)
                                        .fontWeight(.light)
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 8)
                                        .background(viewMode == .list ? Color(hex: "3D3426") : Color(hex: "E8DED0"))
                                        .foregroundColor(viewMode == .list ? Color(hex: "F5F1E8") : Color(hex: "6B5D4F"))
                                        .clipShape(Capsule())
                                }

                                Button {
                                    viewMode = .map
                                } label: {
                                    Text("Map View")
                                        .font(.subheadline)
                                        .fontWeight(.light)
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 8)
                                        .background(viewMode == .map ? Color(hex: "3D3426") : Color(hex: "E8DED0"))
                                        .foregroundColor(viewMode == .map ? Color(hex: "F5F1E8") : Color(hex: "6B5D4F"))
                                        .clipShape(Capsule())
                                }

                                Spacer()

                                Button {
                                    showingFilters.toggle()
                                } label: {
                                    Image(systemName: "line.3.horizontal.decrease.circle")
                                        .font(.title3)
                                        .foregroundColor(Color(hex: "3D3426"))
                                }
                            }
                            .padding(.horizontal)
                        }

                        // Content
                        if viewModel.isLoading {
                            VStack(spacing: 16) {
                                ProgressView()
                                    .scaleEffect(1.5)
                                Text("Loading events...")
                                    .font(.body)
                                    .fontWeight(.light)
                                    .foregroundColor(Color(hex: "6B5D4F"))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 60)
                        } else if let error = viewModel.errorMessage {
                            VStack(spacing: 16) {
                                Image(systemName: "exclamationmark.triangle")
                                    .font(.largeTitle)
                                    .foregroundColor(Color(hex: "6B5D4F"))
                                Text(error)
                                    .font(.body)
                                    .fontWeight(.light)
                                    .foregroundColor(Color(hex: "6B5D4F"))
                                Button("Try Again") {
                                    Task {
                                        await viewModel.loadEvents()
                                    }
                                }
                                .padding()
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 60)
                        } else if viewModel.events.isEmpty {
                            VStack(spacing: 16) {
                                Text("No events available yet")
                                    .font(.body)
                                    .fontWeight(.light)
                                    .foregroundColor(Color(hex: "6B5D4F"))
                                Text("Events are refreshed daily at 9 AM UTC")
                                    .font(.caption)
                                    .fontWeight(.light)
                                    .foregroundColor(Color(hex: "8B7D6F"))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 60)
                        } else {
                            Text("\(viewModel.filteredEvents.count) events")
                                .font(.body)
                                .fontWeight(.light)
                                .foregroundColor(Color(hex: "6B5D4F"))
                                .padding(.horizontal)

                            if viewMode == .map {
                                VStack(spacing: 16) {
                                    MapView(events: viewModel.eventsWithCoordinates)
                                        .frame(height: 500)

                                    // Time filter pills
                                    HStack(spacing: 12) {
                                        Button {
                                            viewModel.timeFilter = .today
                                        } label: {
                                            Text("Today")
                                                .font(.subheadline)
                                                .fontWeight(.light)
                                                .padding(.horizontal, 20)
                                                .padding(.vertical, 8)
                                                .background(viewModel.timeFilter == .today ? Color(hex: "3D3426") : Color(hex: "E8DED0"))
                                                .foregroundColor(viewModel.timeFilter == .today ? Color(hex: "F5F1E8") : Color(hex: "6B5D4F"))
                                                .clipShape(Capsule())
                                        }

                                        Button {
                                            viewModel.timeFilter = .tomorrow
                                        } label: {
                                            Text("Tomorrow")
                                                .font(.subheadline)
                                                .fontWeight(.light)
                                                .padding(.horizontal, 20)
                                                .padding(.vertical, 8)
                                                .background(viewModel.timeFilter == .tomorrow ? Color(hex: "3D3426") : Color(hex: "E8DED0"))
                                                .foregroundColor(viewModel.timeFilter == .tomorrow ? Color(hex: "F5F1E8") : Color(hex: "6B5D4F"))
                                                .clipShape(Capsule())
                                        }

                                        Button {
                                            viewModel.timeFilter = .thisWeek
                                        } label: {
                                            Text("This Week")
                                                .font(.subheadline)
                                                .fontWeight(.light)
                                                .padding(.horizontal, 20)
                                                .padding(.vertical, 8)
                                                .background(viewModel.timeFilter == .thisWeek ? Color(hex: "3D3426") : Color(hex: "E8DED0"))
                                                .foregroundColor(viewModel.timeFilter == .thisWeek ? Color(hex: "F5F1E8") : Color(hex: "6B5D4F"))
                                                .clipShape(Capsule())
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            } else {
                                LazyVStack(spacing: 16) {
                                    ForEach(viewModel.filteredEvents) { event in
                                        EventCard(event: event)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                    .padding(.top, 8)
                    .padding(.bottom)
                }
                .refreshable {
                    await viewModel.loadEvents()
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showingFilters) {
                FilterView(viewModel: viewModel)
            }
        }
        .task {
            await viewModel.loadEvents()
        }
    }
}

#Preview {
    EventListView(viewModel: EventsViewModel())
}
