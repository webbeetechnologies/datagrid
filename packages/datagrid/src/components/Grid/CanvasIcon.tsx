import React, { memo } from 'react';
import { Text } from '../../canvas';
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

export type Props = Konva.TextConfig & {
    size?: number;
    // TODO - map name to icon code
    // name: string;
    type?: any;
};

const CanvasIcon: React.FC<Props> = ({
    size = 24,
    // name,
    type = IconPacks.MaterialCommunity,
    align = 'left',
    verticalAlign = 'middle',
    textColor = '#333',
    wrap = 'none',
    ...rest
}) => {
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

export default memo(CanvasIcon);
