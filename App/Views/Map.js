import React, { Component } from 'react';
import { View } from 'react-native-animatable';
import {
  Button,
  TouchableOpacity,
  Picker,
  Text,
  Image
} from 'react-native';
import { CheckBox, Divider } from 'react-native-elements';
import I18n from '../I18n/i18n';
import FastImage from 'react-native-fast-image';
import { connect } from 'react-redux';
import InterestPointsActions from '../Redux/InterestPointsRedux'
//turf
import { point } from '@turf/helpers';
import buffer from '@turf/buffer';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
//
import OptionIcon from 'react-native-vector-icons/Ionicons'
import redMarker from '../Images/Icons/marker-red.png';
import blueMarker from '../Images/Icons/marker-blue.png';
import styles from './Styles/MapStyles'
//mapbox
import SenderosGeoJSON from '../Jsons/senderos-pn-tdf-es.json';
import SenderosEmergenciaGeoJSON from '../Jsons/senderos-emergencia-pn-tdf.json';
/* import SenderosGeoJSON from '../Jsons/newtrails-pn-tdf.json'; */
import PuntosInteresGeoJSON from '../Jsons/puntos-interes-pn-tdf.json';
import MapboxGL from "@react-native-mapbox-gl/maps";
import { primaryDark, primary, primaryLight, secondaryDark, secondaryLight } from '../global.styles';
MapboxGL.setAccessToken("pk.eyJ1Ijoic2VuZGVyb3MiLCJhIjoiY2swdmR3OGgzMHk0ODNtcXM5ZzVzbng1aSJ9.aPqBLjTycTdR-4gMbpSM8w");

var updateLocation = 0

class Map extends Component {

  constructor(props){
    super(props);
    this.onMapPress = this.onMapPress.bind(this); 
    this.onSourceLayerPress = this.onSourceLayerPress.bind(this);
    this.onFiltersBtnPress = this.onFiltersBtnPress.bind(this);
    this.onCloseBtnPress = this.onCloseBtnPress.bind(this);
    this.updateLayers = this.updateLayers.bind(this);
    this.onUserLocationUpdate = this.onUserLocationUpdate.bind(this);
    this.state = {
      showTrails: true,
      showEmergencyTrails: false,
      showInterestPoints: true,
      showCard: false,
      cardData: {},
      showFilters: false,
      trail: 0,
      layer: 0
    };
  }

  async componentDidMount() {
    //
  }  

  onUserLocationUpdate(location) { //el t de actualización no es exactamente de 1s, a veces es mayor
    if (updateLocation == 15) { 
      copy = JSON.parse(JSON.stringify(this.props.interestPoints))
      posActual = [location.coords.longitude, location.coords.latitude]
      var bufferPos = buffer(point(posActual), 0.04); //valor en km por defecto [Ahora son 40mts]
      for (var i = copy.features.length - 1; i >= 0; i--) {
        let p = point([copy.features[i].geometry.coordinates[0], copy.features[i].geometry.coordinates[1]])
        if (booleanPointInPolygon(p, bufferPos)) {
          if (copy.features[i].properties.State == 'oculto') {
            copy.features[i].properties.State = 'visitado'
            this.props.updateInterestPoints(copy)
          }
        }
      }
      updateLocation = 0
    }
    updateLocation = updateLocation + 1
  }

  updateLayers(selectedValue) {
    switch(selectedValue) {
      case 0:
        this.setState({
          showTrails: true,
          showInterestPoints: true,
          layer: selectedValue
        });
        break;
      case 1:
        this.setState({
          showTrails: true,
          showInterestPoints: false,
          layer: selectedValue
        });
        break;
      case 2:
        this.setState({
          showTrails: false,
          showInterestPoints: true,
          layer: selectedValue
        });
        break;
    }
  }

  onMapPress() {
    this.setState({
      showCard: false,
      showFilters: false
    });
  }

  onSourceLayerPress(e) {
    const feature = e.nativeEvent.payload;
    this.setState({
      cardData: feature,
      showCard: true,
      showFilters: false
    });
  }

  onFiltersBtnPress() {
    this.setState(prevState => ({
      showFilters: !prevState.showFilters,
      showCard: false
    }));
  }

  onCloseBtnPress() {
    this.setState({
      showCard: false
    });
  }

  renderCard() {
    const { navigate } = this.props.navigation;
    const cardProps = this.state.cardData.properties;

    if (this.state.showCard)
      if ("State" in cardProps) {
        return ( 
          <View animation="slideInUp" style={styles.detailsContainer}>
            <View style={styles.titleContainer}>
              <TouchableOpacity
                style={styles.closeFiltersButton}
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                onPress={this.onCloseBtnPress}
              >
                <OptionIcon name="md-close" style={{ fontSize: 35 }}/>
              </TouchableOpacity> 

              <Text numberOfLines={1} ellipsizeMode='tail' style={styles.detailsTitle}>
                {cardProps.Name}
              </Text>
            </View>

            <View style={{paddingHorizontal:20}}>
              <FastImage style={styles.image} 
                        source={{priority: FastImage.priority.high},
                        cardProps.photo}
              />
              <TouchableOpacity
                onPress={ () => navigate('interestPoint', {point: cardProps.id -1}) }
                disabled={cardProps.State == "visitado" ? false : true }
              >
                <Text style={(cardProps.State == "visitado" ? styles.info : styles.infoDisabled)}>{I18n.t('info')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      } 
      else {
        return ( 
          <View animation="slideInUp" style={styles.detailsContainer}>
            <View style={styles.titleContainer}>
              <TouchableOpacity
                style={styles.closeFiltersButton}
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                onPress={this.onCloseBtnPress}
              >
                <OptionIcon name="md-close" style={{ fontSize: 35 }}/>
              </TouchableOpacity> 
              
              <Text numberOfLines={1} ellipsizeMode='tail' style={styles.detailsTitle}>
                {cardProps.name}
              </Text>
            </View>

            <View style={{paddingHorizontal:20}}>
              <Image
                style={styles.image}
                source={{uri: cardProps.images}}
              />
              <TouchableOpacity
                onPress={ () => navigate('trail', {trail: cardProps.id -1}) }
              >
                <Text style={styles.info}>{I18n.t('info')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
    return null;
  }

  renderFilters() {
    if (this.state.showFilters)
      return (
          <View style={styles.filtersContainer}>
            <View style={styles.titleContainer}>
              <TouchableOpacity
                style={styles.closeFiltersButton}
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                onPress={this.onFiltersBtnPress}
              >
                <OptionIcon name="md-close" style={{ fontSize: 35 }}/>
              </TouchableOpacity>
              <Text style={styles.filtersTitle}>{I18n.t("filters")}</Text>
            </View>  

            <View style={{alignSelf: "center", paddingVertical:4}}>
              <Text style={{fontWeight:'bold'}}>{I18n.t("trails")}:</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={this.state.trail}
                  onValueChange={(itemValue) =>
                    this.setState({showTrails: true, trail: itemValue})
                  }>
                  <Picker.Item label={I18n.t("all")} value={0}/>
                  {
                    SenderosGeoJSON.features.map((item) =>{
                      return(
                      <Picker.Item label={item.properties.name} value={item.properties.id} key={item.properties.id}/>
                      );
                    })
                  }
                </Picker>
              </View>
              <Text style={{paddingTop:20, fontWeight:'bold'}}>{I18n.t("layers")}:</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={this.state.layer}
                  onValueChange={(itemValue) => this.updateLayers(itemValue)}>
                  <Picker.Item label={I18n.t("all")} value={0}/>
                  <Picker.Item label={I18n.t("trails")} value={1}/>
                  <Picker.Item label={I18n.t("interestPoints")} value={2}/>
                </Picker>
              </View>
              <CheckBox
                containerStyle={styles.emergency}
                title={I18n.t("emergencyTrails")}
                uncheckedColor="grey"
                checked={this.state.showEmergencyTrails}
                onPress={() => this.setState({showEmergencyTrails: !this.state.showEmergencyTrails})}
              />
            </View>
          </View>
      );
    return null;
  }

  render() {
    const { interestPoints } = this.props

    if (Object.keys(interestPoints).length == 0) {
      return (
        <View style={{flex: 1, paddingTop: 50}}>
          <ActivityIndicator />
        </View>
      )
    } else {
      return (
        <View style={styles.container}>
          <MapboxGL.MapView
            onPress={this.onMapPress}
            style={styles.map}
            styleURL={'mapbox://styles/senderos/ck1qwqq5f3zom1cnnju1xvqha'}
          >
            <MapboxGL.UserLocation 
              visible={true}
              onUpdate={this.onUserLocationUpdate}
            />
            <MapboxGL.Camera
              minZoomLevel={10}
              maxZoomLevel={20}
              zoomLevel={10}
              /* followUserLocation={true} */
              centerCoordinate={[-68.500416, -54.820684]}
              /* maxBounds={{ne: [-68.32, -54.741], sw: [-68.61, -54.90]}}  */
            />
            <MapboxGL.ShapeSource 
              id="senderosSource"
              shape={SenderosGeoJSON}
              onPress={this.onSourceLayerPress}
            >
              <MapboxGL.LineLayer
                id="senderos-pn-tdf"
                style={{ lineColor: primary, lineWidth: 3, visibility: this.state.showTrails ? 'visible' : 'none' }}
                filter={this.state.trail == 0 ? ['all'] : ['==', 'id', this.state.trail]}
              />
            </MapboxGL.ShapeSource>
            <MapboxGL.ShapeSource 
              id="senderosEmergenciaSource"
              shape={SenderosEmergenciaGeoJSON}
            >
              <MapboxGL.LineLayer
                id="senderos-emergencia-pn-tdf"
                style={{ lineColor: primaryDark, lineWidth: 3, visibility: this.state.showEmergencyTrails ? 'visible' : 'none' }}
              />
            </MapboxGL.ShapeSource>
            <MapboxGL.ShapeSource 
              id="PuntosInteresVisibles"
              shape={interestPoints}
              onPress={this.onSourceLayerPress}
            >
              <MapboxGL.SymbolLayer
                id="puntos_interes-visibles"
                style={{iconImage: blueMarker, iconSize: 0.5, iconAllowOverlap: false, visibility: this.state.showInterestPoints ? 'visible' : 'none'}}
                filter={['==', 'State', 'visitado']}
              />
            </MapboxGL.ShapeSource>
            <MapboxGL.ShapeSource 
              id="PuntosInteresOcultos"
              shape={interestPoints}
              onPress={this.onSourceLayerPress}
            >
              <MapboxGL.SymbolLayer
                id="puntos_interes-ocultos"
                style={{iconImage: redMarker, iconSize: 0.5, iconAllowOverlap: false, visibility: this.state.showInterestPoints ? 'visible' : 'none'}}
                filter={['==', 'State', 'oculto']}
              />
            </MapboxGL.ShapeSource>

          </MapboxGL.MapView>

          <TouchableOpacity 
            style={[styles.optionsButton, {bottom: this.state.showFilters > this.state.showCard ? 310 : 
                                                   this.state.showCard ? 250 : 15}]}
                                                   onPress={this.onFiltersBtnPress}
          >
            <OptionIcon name="md-options" style={{ fontSize: 35 }} color={primaryDark}/>
          </TouchableOpacity>

          {this.renderCard()}
          
          {this.renderFilters()}

        </View>
      );
    } 
  }
}

const mapStateToProps = (state) => ({
  interestPoints: state.interestPoints.data
});

const mapDispatchToProps = (dispatch) => ({
  updateInterestPoints: (interestPoints) => dispatch(InterestPointsActions.updateData(interestPoints))
});

export default connect(
  mapStateToProps, 
  mapDispatchToProps
)(Map);
