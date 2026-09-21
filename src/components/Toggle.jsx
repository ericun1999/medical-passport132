import { Pressable, StyleSheet, View } from 'react-native'
import { colors } from '../theme'

export default function Toggle({ checked, onChange }) {
  return (
    <Pressable onPress={onChange} style={[styles.track, checked ? styles.on : styles.off]}>
      <View style={[styles.thumb, checked ? styles.thumbOn : styles.thumbOff]} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    marginLeft: 16,
  },
  on: {
    backgroundColor: colors.emerald500,
  },
  off: {
    backgroundColor: colors.slate200,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  thumbOn: {
    alignSelf: 'flex-end',
    marginRight: 2,
  },
  thumbOff: {
    alignSelf: 'flex-start',
    marginLeft: 2,
  },
})
