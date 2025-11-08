//
//  ContentView.swift
//  Ephemera
//
//  Created by Adnan Akil on 11/1/25.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = EventsViewModel()

    var body: some View {
        EventListView(viewModel: viewModel)
    }
}

#Preview {
    ContentView()
}
