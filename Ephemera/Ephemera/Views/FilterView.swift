//
//  FilterView.swift
//  Ephemera
//
//  Created by Adnan Akil on 11/1/25.
//

import SwiftUI

struct FilterView: View {
    @ObservedObject var viewModel: EventsViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "F5F1E8")
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Borough Filter
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Borough")
                                .font(.subheadline)
                                .fontWeight(.light)
                                .foregroundColor(Color(hex: "6B5D4F"))

                            FlowLayout(spacing: 8) {
                                ForEach(viewModel.boroughs, id: \.self) { borough in
                                    Button {
                                        viewModel.selectedBorough = borough
                                    } label: {
                                        Text(borough)
                                            .font(.subheadline)
                                            .fontWeight(.light)
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 8)
                                            .background(
                                                viewModel.selectedBorough == borough ?
                                                Color(hex: "3D3426") : Color(hex: "E8DED0")
                                            )
                                            .foregroundColor(
                                                viewModel.selectedBorough == borough ?
                                                Color(hex: "F5F1E8") : Color(hex: "6B5D4F")
                                            )
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }

                        // Neighborhood Search
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Search Neighborhood")
                                .font(.subheadline)
                                .fontWeight(.light)
                                .foregroundColor(Color(hex: "6B5D4F"))

                            TextField("e.g., Williamsburg, SoHo...", text: $viewModel.neighborhoodSearch)
                                .padding()
                                .background(Color(hex: "E8DED0"))
                                .foregroundColor(Color(hex: "3D3426"))
                                .clipShape(Capsule())
                                .autocorrectionDisabled()
                        }

                        // Clear Filters
                        if viewModel.selectedBorough != "All" || !viewModel.neighborhoodSearch.isEmpty {
                            Button {
                                viewModel.clearFilters()
                            } label: {
                                Text("Clear filters")
                                    .font(.subheadline)
                                    .fontWeight(.light)
                                    .foregroundColor(Color(hex: "6B5D4F"))
                                    .underline()
                            }
                        }

                        Spacer()
                    }
                    .padding()
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(Color(hex: "3D3426"))
                }
            }
        }
    }
}

// Flow layout for wrapping borough buttons
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, y: bounds.minY + result.positions[index].y), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize
        var positions: [CGPoint]

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var positions: [CGPoint] = []
            var size: CGSize = .zero
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let subviewSize = subview.sizeThatFits(.unspecified)

                if currentX + subviewSize.width > maxWidth && currentX > 0 {
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: currentX, y: currentY))
                currentX += subviewSize.width + spacing
                lineHeight = max(lineHeight, subviewSize.height)
                size.width = max(size.width, currentX - spacing)
            }

            size.height = currentY + lineHeight
            self.size = size
            self.positions = positions
        }
    }
}

#Preview {
    FilterView(viewModel: EventsViewModel())
}
