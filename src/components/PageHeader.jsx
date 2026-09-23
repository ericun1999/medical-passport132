import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { FontAwesome } from '@expo/vector-icons'
import { colors } from '../theme'

export default function PageHeader({ title, onBack, extra }) {
  const navigation = useNavigation()

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onBack || (() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')))}
        style={styles.back}
      >
        <FontAwesome name="chevron-left" size={14} color={colors.white} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {extra ? extra : <View style={styles.spacer} />}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.blue700,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 16,
    flex: 1,
  },
  spacer: {
    width: 32,
  },
})
