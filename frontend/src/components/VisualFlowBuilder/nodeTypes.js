import MessageNode from './nodes/MessageNode';
import MediaNode from './nodes/MediaNode';
import AudioNode from './nodes/AudioNode';
import DelayNode from './nodes/DelayNode';
import ConditionNode from './nodes/ConditionNode';
import RandomizerNode from './nodes/RandomizerNode';
import LinkFunnelNode from './nodes/LinkFunnelNode';
import ChatwootLabelNode from './nodes/ChatwootLabelNode';
import UpdateContactNode from './nodes/UpdateContactNode';
import TemplateNode from './nodes/TemplateNode';
import DateNode from './nodes/DateNode';
import HttpRequestNode from './nodes/HttpRequestNode';
import RouletteNode from './nodes/RouletteNode';
import LocalSegmentNode from './nodes/LocalSegmentNode';
import BusinessHoursNode from './nodes/BusinessHoursNode';
import PixelNode from './nodes/PixelNode';
import CrmActionsNode from './nodes/CrmActionsNode';
import HotLeadsNode from './nodes/HotLeadsNode';
import SendTemplateNode from './nodes/SendTemplateNode';
import CheckWindowNode from './nodes/CheckWindowNode';
import WaitEventNode from './nodes/WaitEventNode';
import InputDataNode from './nodes/InputDataNode';

const nodeTypes = {
    messageNode: MessageNode,
    mediaNode: MediaNode,
    audioNode: AudioNode,
    delayNode: DelayNode,
    conditionNode: ConditionNode,
    randomizerNode: RandomizerNode,
    linkFunnelNode: LinkFunnelNode,
    chatwoot_label: ChatwootLabelNode,
    updateContactNode: UpdateContactNode,
    templateNode: TemplateNode,
    dateNode: DateNode,
    httpRequestNode: HttpRequestNode,
    rouletteNode: RouletteNode,
    localSegmentNode: LocalSegmentNode,
    businessHoursNode: BusinessHoursNode,
    pixelNode: PixelNode,
    crmActionsNode: CrmActionsNode,
    hotLeadsNode: HotLeadsNode,
    sendTemplateNode: SendTemplateNode,
    checkWindowNode: CheckWindowNode,
    waitEventNode: WaitEventNode,
    inputDataNode: InputDataNode
};

export default nodeTypes;
