import streetview as sv
import folium
import webbrowser
import os

lat, lon = 37.7822446,-122.412263

def create_map_with_panoramas(panos):
    # Create a map centered on the search location
    m = folium.Map(location=[lat, lon], zoom_start=18)
    
    # Add markers for each panorama
    for i, pano in enumerate(panos):
        popup_html = f"""
        <b>Panorama {i+1}</b><br>
        ID: {pano.pano_id}<br>
        Date: {pano.date}<br>
        <button onclick="navigator.clipboard.writeText('{pano.pano_id}')">Copy ID</button>
        """
        folium.Marker(
            [pano.lat, pano.lon],
            popup=popup_html,
            tooltip=f"Panorama {i+1}"
        ).add_to(m)
    
    # Save and open the map
    map_path = "panoramas_map.html"
    m.save(map_path)
    webbrowser.open('file://' + os.path.realpath(map_path))

if __name__ == "__main__":
    panos = sv.search_panoramas(lat, lon)
    
    # Display panoramas on map
    create_map_with_panoramas(panos)
    
    # Print panorama information
    for i, pano in enumerate(panos):
        print(f"\nPanorama {i+1}:")
        print(f"  ID: {pano.pano_id}")
        print(f"  Latitude: {pano.lat}")
        print(f"  Longitude: {pano.lon}")
        print(f"  Date: {pano.date}")
    
    # Get user input for panorama selection
    while True:
        pano_id = input("\nEnter the panorama ID to download (or 'q' to quit): ")
        if pano_id.lower() == 'q':
            break
        try:
            image = sv.get_panorama(pano_id=pano_id, multi_threaded=True)
            image.save(f"panorama_{pano_id[:8]}.jpg")
            print(f"Image saved as panorama_{pano_id[:8]}.jpg")
            break
        except Exception as e:
            print(f"Error: {e}")
            print("Please try again with a valid panorama ID")