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
import LegacyDateNode from './nodes/LegacyDateNode';

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
    dateNode: LegacyDateNode
};

export default nodeTypes;
