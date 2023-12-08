import { Text } from 'react-konva';
import type Konva from 'konva';

// TODO - load icon packs based on type
export enum IconPacks {
    Material = 'material',
    MaterialCommunity = 'material-community',
    SimpleLineIcon = 'simple-line-icon',
    Zocial = 'zocial',
    FontAwesome = 'font-awesome',
    Octicon = 'octicon',
    Ionicon = 'ionicon',
    Feather = 'feather',
    Fontisto = 'fontisto',
    Foundation = 'foundation',
    EvilIcons = 'evilicon',
    Entypo = 'entypo',
    AntDesign = 'antdesign',
    FontAwesome5 = 'font-awesome-5',
}

export type Props = Konva.NodeConfig & {
    size?: number;
    // TODO - map name to icon code
    // name: string;
    type?: any;
};

const CanvasIcon = ({
    size = 24,
    // name,
    type = IconPacks.MaterialCommunity,
    align = 'left',
    verticalAlign = 'middle',
    textColor = '#333',
    wrap = 'none',
    ...rest
}: Props) => {
    return (
        <Text
            hitStrokeWidth={0}
            {...rest}
            fontSize={size}
            fontFamily={type}
            align={align}
            verticalAlign={verticalAlign}
            fill={textColor}
            wrap={wrap}
        />
    );
};

export default CanvasIcon;
